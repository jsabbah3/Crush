import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { AlertMode } from "@/generated/prisma/enums";
import { trackServerEvent } from "@/lib/analytics-node";

const resend = new Resend(process.env.RESEND_API_KEY);
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
    company: { name: string; slug: string };
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
          company: { select: { name: true, slug: true } },
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
  const { error } = await resend.emails.send({
    from: "Crush <alerts@crushco.app>",
    to,
    subject,
    html: buildHtml(name ?? "there", matches, unsubscribeToken, userId, emailType),
    headers: {
      "List-Unsubscribe": `<${APP_URL}/api/unsubscribe?token=${unsubscribeToken}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  return !error;
}

function emailLink(dest: string, uid: string, type: string, utm: string): string {
  const utmDest = `${dest}${dest.includes("?") ? "&" : "?"}utm_source=email&utm_medium=email&utm_campaign=${type}`;
  const wrapped = `${APP_URL}/api/email/click?uid=${uid}&type=${type}&url=${encodeURIComponent(utmDest)}`;
  return wrapped;
}

function buildHtml(
  name: string,
  matches: MatchRow[],
  token: string,
  userId: string,
  emailType: string,
): string {
  const pauseUrl = `${APP_URL}/api/unsubscribe?token=${token}`;
  const settingsUrl = emailLink(`${APP_URL}/settings`, userId, emailType, "settings");
  const matchesUrl = emailLink(`${APP_URL}/matches`, userId, emailType, "view_matches");
  const pixelUrl = `${APP_URL}/api/email/pixel?uid=${userId}&type=${emailType}`;

  const jobCards = matches.map((m) => {
    const loc = m.job.remote ? "Remote" : (m.job.location ?? "On-site");
    const rawUrl = m.job.url ?? `${APP_URL}/matches`;
    const applyUrl = emailLink(rawUrl, userId, emailType, "apply");
    const companyUrl = emailLink(`${APP_URL}/companies/${m.trackedCompany.company.slug}`, userId, emailType, "company");

    return `
    <tr>
      <td style="padding:0 0 12px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e4dc;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:18px 20px;background:#ffffff;">
              <!-- Company name -->
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#9ca3af;">${m.trackedCompany.company.name}</p>
              <!-- Job title -->
              <p style="margin:0 0 10px;font-size:17px;font-weight:600;color:#111111;line-height:1.3;">${m.job.title}</p>
              <!-- Meta row -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:8px;">
                    <span style="display:inline-block;padding:3px 10px;background:#f3f4f6;border-radius:20px;font-size:12px;color:#6b7280;font-weight:500;">${loc}</span>
                  </td>
                  <td>
                    <a href="${applyUrl}" style="display:inline-block;padding:3px 12px;background:#111111;border-radius:20px;font-size:12px;color:#ffffff;font-weight:600;text-decoration:none;">Apply →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join("");

  const greeting = matches.length === 1
    ? `A role just opened at <strong>${matches[0].trackedCompany.company.name}</strong> that matches your criteria.`
    : `${matches.length} new roles just opened at companies on your watchlist.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f7f6f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f3;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 28px 0;">
              <a href="${APP_URL}" style="font-size:16px;font-weight:700;color:#111111;text-decoration:none;letter-spacing:-0.01em;">Crush</a>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:0 0 8px 0;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#111111;line-height:1.3;">Hi ${name}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 24px 0;">
              <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">${greeting}</p>
            </td>
          </tr>

          <!-- Job cards -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${jobCards}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:20px 0 0 0;">
              <a href="${matchesUrl}" style="display:inline-block;padding:12px 24px;background:#111111;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">View all matches →</a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:32px 0 24px 0;">
              <div style="height:1px;background:#e8e4dc;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td>
              <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;line-height:1.6;">
                You're getting this because you follow companies on
                <a href="${APP_URL}" style="color:#9ca3af;text-decoration:underline;">Crush</a>.
              </p>
              <p style="margin:0;font-size:12px;">
                <a href="${settingsUrl}" style="color:#6b7280;text-decoration:none;">Alert settings</a>
                <span style="color:#d1d5db;margin:0 8px;">&middot;</span>
                <a href="${pauseUrl}" style="color:#6b7280;text-decoration:none;">Unsubscribe</a>
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
