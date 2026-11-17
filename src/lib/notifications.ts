import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { AlertMode } from "@/generated/prisma/enums";
import { trackServerEvent } from "@/lib/analytics-node";
import { emailLink } from "@/lib/email-links";

// Lazily constructed: the Resend constructor throws on a missing key, so a
// module-level `new Resend()` made `next build` require RESEND_API_KEY at
// build time (it collects page data for /api/cron/* which import this file).
// Runtime is the only place the key is actually needed.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const APP_URL = process.env.APP_URL ?? "https://crushco.app";

type MatchRow = {
  id: string;
  createdAt: Date;
  job: {
    title: string;
    url: string | null;
    location: string | null;
    remote: boolean;
    type: string;
  };
  trackedCompany: {
    company: { id: string; name: string; slug: string };
    user: {
      id: string;
      email: string;
      name: string | null;
      unsubscribeToken: string;
    };
  };
};

// ─── Public API ──────────────────────────────────────────────────────────────

// Called by /api/cron/notify every 15 minutes.
// For each user with instant alerts, send all pending matches once the oldest
// is >= 15 minutes old (natural batching window across concurrent ingestion runs).
export async function dispatchInstantAlerts(): Promise<{ sent: number; errors: number }> {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);

  const pending = await fetchPending({ alertMode: AlertMode.instant });
  const byUser = groupByUser(pending);

  let sent = 0;
  let errors = 0;

  for (const [, matches] of byUser) {
    if (matches[0].createdAt > cutoff) continue; // batch window still open

    const { id: userId, email, name, unsubscribeToken } = matches[0].trackedCompany.user;
    const ok = await sendEmail({
      userId,
      to: email,
      name,
      matches,
      subject: buildInstantSubject(matches),
      unsubscribeToken,
      emailType: "instant_alert",
    });

    if (ok) {
      await markNotified(matches.map((m) => m.id));
      await trackServerEvent(userId, "alert_email_sent", {
        email_type: "instant_alert",
        match_count: matches.length,
      });
      sent += matches.length;
    } else {
      errors++;
    }
  }

  return { sent, errors };
}

// Called by /api/cron/digest once daily.
// Sends one digest per user covering all unnotified matches. No time floor:
// a hard 24h window permanently dropped any match that slipped past one run
// (failed cron, or a match created moments outside the window).
export async function sendDailyDigest(): Promise<{ sent: number; errors: number }> {
  const pending = await fetchPending({ alertMode: AlertMode.daily });
  const byUser = groupByUser(pending);

  let sent = 0;
  let errors = 0;

  for (const [, matches] of byUser) {
    const { id: userId, email, name, unsubscribeToken } = matches[0].trackedCompany.user;
    const ok = await sendEmail({
      userId,
      to: email,
      name,
      matches,
      subject: buildDailySubject(matches),
      unsubscribeToken,
      emailType: "daily_digest",
    });

    if (ok) {
      await markNotified(matches.map((m) => m.id));
      await trackServerEvent(userId, "alert_email_sent", {
        email_type: "daily_digest",
        match_count: matches.length,
      });
      sent += matches.length;
    } else {
      errors++;
    }
  }

  return { sent, errors };
}

// ─── Subject line builders ────────────────────────────────────────────────────

function buildInstantSubject(matches: MatchRow[]): string {
  const companies = [...new Set(matches.map((m) => m.trackedCompany.company.name))];
  if (matches.length === 1) {
    // "Senior Engineer just opened at Stripe"
    return `${matches[0].job.title} just opened at ${companies[0]}`;
  }
  if (companies.length === 1) {
    // "3 new roles just opened at Anthropic"
    return `${matches.length} new roles just opened at ${companies[0]}`;
  }
  // "Staff Engineer at Stripe + 2 more new matches"
  return `${matches[0].job.title} at ${companies[0]} + ${matches.length - 1} more new match${matches.length - 1 > 1 ? "es" : ""}`;
}

function buildDailySubject(matches: MatchRow[]): string {
  const companies = [...new Set(matches.map((m) => m.trackedCompany.company.name))];
  const companyList = companies.slice(0, 2).join(", ") + (companies.length > 2 ? ` + ${companies.length - 2} more` : "");
  return `${matches.length} new match${matches.length > 1 ? "es" : ""} — ${companyList}`;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function fetchPending({
  alertMode,
  since,
}: {
  alertMode: AlertMode;
  since?: Date;
}): Promise<MatchRow[]> {
  return prisma.match.findMany({
    where: {
      notified: false,
      ...(since ? { createdAt: { gte: since } } : {}),
      trackedCompany: {
        emailAlerts: true,
        user: { alertMode, alertsPaused: false },
      },
    },
    select: {
      id: true,
      createdAt: true,
      job: {
        select: { title: true, url: true, location: true, remote: true, type: true },
      },
      trackedCompany: {
        select: {
          company: { select: { id: true, name: true, slug: true } },
          user: {
            select: { id: true, email: true, name: true, unsubscribeToken: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  }) as Promise<MatchRow[]>;
}

function groupByUser(matches: MatchRow[]): Map<string, MatchRow[]> {
  const map = new Map<string, MatchRow[]>();
  for (const m of matches) {
    const uid = m.trackedCompany.user.id;
    if (!map.has(uid)) map.set(uid, []);
    map.get(uid)!.push(m);
  }
  return map;
}

async function markNotified(ids: string[]) {
  await prisma.match.updateMany({
    where: { id: { in: ids } },
    data: { notified: true, notifiedAt: new Date() },
  });
}

async function sendEmail({
  userId,
  to,
  name,
  matches,
  subject,
  unsubscribeToken,
  emailType,
}: {
  userId: string;
  to: string;
  name: string | null;
  matches: MatchRow[];
  subject: string;
  unsubscribeToken: string;
  emailType: string;
}): Promise<boolean> {
  // "Who you know here" — first-degree LinkedIn connections per company.
  // The warm path matters more than the apply button.
  const companyIds = [...new Set(matches.map((m) => m.trackedCompany.company.id))];
  const connectionGroups = companyIds.length > 0
    ? await prisma.linkedInConnection.groupBy({
        by: ["companyId"],
        where: { userId, companyId: { in: companyIds } },
        _count: { _all: true },
      })
    : [];
  const networkByCompanyId = new Map(
    connectionGroups.map((g) => [g.companyId as string, g._count._all]),
  );

  const { error } = await getResend().emails.send({
    from: "Crush <alerts@crushco.app>",
    to,
    subject,
    html: buildHtml(name ?? "there", matches, unsubscribeToken, userId, emailType, networkByCompanyId),
    headers: {
      "List-Unsubscribe": `<${APP_URL}/api/unsubscribe?token=${unsubscribeToken}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  return !error;
}

// Job titles and company names come from third-party job boards, and the
// user's name from their Google profile — none of it is ours, so none of it
// goes into the HTML unescaped.
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// The site's palette, as the hex email needs.
const INK = "#2A2520";
const RED = "#E0491F";
const PAPER = "#FDFBF6";
const DESK = "#F3EFE6";
const MUTE = "#6E665D";
const RULE = "#DDD5C8";
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Courier New',monospace";
const CAPS = `font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;`;

/**
 * The alert email, set like the site: a masthead, a heavy rule, then the role
 * as the headline. Short on purpose — the role is the whole message.
 */
export function buildHtml(
  name: string,
  matches: MatchRow[],
  token: string,
  userId: string,
  emailType: string,
  networkByCompanyId: Map<string, number> = new Map(),
): string {
  const pauseUrl = `${APP_URL}/api/unsubscribe?token=${token}`;
  const settingsUrl = emailLink(`${APP_URL}/settings`, userId, emailType);
  const matchesUrl = emailLink(`${APP_URL}/dashboard`, userId, emailType);
  const pixelUrl = `${APP_URL}/api/email/pixel?uid=${userId}&type=${emailType}`;

  const firstName = esc(name.trim().split(/\s+/)[0] || "you");
  const single = matches.length === 1;
  const dateLine = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York",
  });

  const roles = matches.map((m, i) => {
    const company = esc(m.trackedCompany.company.name);
    const loc = esc(m.job.remote ? "Remote" : (m.job.location ?? "On-site"));
    const rawUrl = m.job.url ?? `${APP_URL}/dashboard`;
    const applyUrl = emailLink(rawUrl, userId, emailType);
    const networkCount = networkByCompanyId.get(m.trackedCompany.company.id) ?? 0;
    const networkUrl = emailLink(`${APP_URL}/companies/${m.trackedCompany.company.slug}#network`, userId, emailType);
    const networkLine = networkCount > 0
      ? `<p style="margin:10px 0 0;font-family:${SANS};font-size:14px;line-height:1.5;color:${INK};">You know <strong>${networkCount} ${networkCount === 1 ? "person" : "people"}</strong> there. <a href="${networkUrl}" style="color:${RED};font-weight:600;">See who &rarr;</a></p>`
      : "";
    const rank = String(i + 1).padStart(2, "0");

    return `
          <tr>
            <td style="padding:${i === 0 ? "0" : "22px"} 0 ${i === matches.length - 1 ? "0" : "22px"} 0;${i === 0 ? "" : `border-top:1px solid ${RULE};`}">
              <p style="margin:0 0 8px;${CAPS}color:${RED};">${single ? "" : `${rank} &middot; `}New role &middot; ${company}</p>
              <p style="margin:0 0 8px;font-family:${SERIF};font-size:${single ? "30" : "23"}px;font-weight:700;line-height:1.1;letter-spacing:-0.02em;color:${INK};">${esc(m.job.title)}</p>
              <p style="margin:0;font-family:${MONO};font-size:12px;line-height:1.5;color:${MUTE};">${company} &middot; ${loc}</p>
              ${networkLine}
              <p style="margin:16px 0 0;">
                <a href="${applyUrl}" style="display:inline-block;padding:11px 20px;background:${single ? RED : INK};font-family:${SANS};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">See the role &rarr;</a>
              </p>
            </td>
          </tr>`;
  }).join("");

  const intro = single
    ? `A company on your list just posted a role that fits what you asked for.`
    : `${matches.length} roles that fit what you asked for opened at companies on your list.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
</head>
<body style="margin:0;padding:0;background:${DESK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${DESK};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${PAPER};border:1px solid ${INK};border-top:4px solid ${INK};">
          <tr>
            <td style="padding:22px 32px 30px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                <!-- Masthead -->
                <tr>
                  <td style="padding:0 0 12px 0;border-bottom:1px solid ${INK};">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <a href="${APP_URL}" style="font-family:${SERIF};font-size:24px;font-weight:700;color:${INK};text-decoration:none;letter-spacing:-0.03em;">Crush<span style="color:${RED};">&bull;</span></a>
                        </td>
                        <td align="right" style="font-family:${MONO};font-size:11px;color:${MUTE};">For ${firstName} &middot; ${dateLine}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:20px 0 24px 0;">
                    <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.6;color:${MUTE};">${intro}</p>
                  </td>
                </tr>

                <tr>
                  <td>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${roles}
                    </table>
                  </td>
                </tr>

                ${single ? "" : `<tr>
                  <td style="padding:24px 0 0 0;">
                    <a href="${matchesUrl}" style="font-family:${SANS};font-size:14px;font-weight:600;color:${INK};">Open all of them on Crush &rarr;</a>
                  </td>
                </tr>`}

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 32px 22px;border-top:1px solid ${RULE};">
              <p style="margin:0 0 6px;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTE};">
                You&rsquo;re getting this because ${single ? "this company is" : "these companies are"} on your list at
                <a href="${APP_URL}" style="color:${MUTE};text-decoration:underline;">Crush</a>. We only email when a role fits.
              </p>
              <p style="margin:0;font-family:${SANS};font-size:12px;">
                <a href="${settingsUrl}" style="color:${INK};text-decoration:underline;">Alert settings</a>
                <span style="color:${RULE};margin:0 8px;">&middot;</span>
                <a href="${pauseUrl}" style="color:${INK};text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Open tracking pixel -->
  <img src="${pixelUrl}" width="1" height="1" style="border:0;display:block;width:1px;height:1px;" alt="" />
</body>
</html>`;
}
