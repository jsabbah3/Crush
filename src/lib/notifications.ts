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
    company: { name: string };
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
// Sends one digest per user covering all unnotified matches from the last 24 hours.
export async function sendDailyDigest(): Promise<{ sent: number; errors: number }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const pending = await fetchPending({ alertMode: AlertMode.daily, since });
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
          company: { select: { name: true } },
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
  const rows = matches
    .map((m) => {
      const loc = m.job.remote ? "Remote" : (m.job.location ?? "Location not listed");
      const rawUrl = m.job.url ?? `${APP_URL}/companies`;
      const trackedUrl = emailLink(rawUrl, userId, emailType, "apply");
      const link = `<a href="${trackedUrl}" style="color:#E8A830;font-weight:500">${m.job.title}</a>`;
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #2e2a20">
            ${link}<br/>
            <span style="color:#8b7f66;font-size:13px">${m.trackedCompany.company.name} &middot; ${loc}</span>
          </td>
        </tr>`;
    })
    .join("");

  const pauseUrl = `${APP_URL}/api/unsubscribe?token=${token}`;
  const settingsUrl = emailLink(`${APP_URL}/settings`, userId, emailType, "settings");
  const pixelUrl = `${APP_URL}/api/email/pixel?uid=${userId}&type=${emailType}`;

  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#f2eddf;background:#0d0c09">
  <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#8b7f66">Crush</p>
  <p style="margin:0 0 4px;font-size:20px;font-weight:600">Hi ${name},</p>
  <p style="margin:0 0 24px;color:#8b7f66;font-size:15px">New roles just opened at companies you're tracking:</p>

  <table style="width:100%;border-collapse:collapse">${rows}</table>

  <div style="margin-top:28px;padding:16px;background:#1a1813;border-radius:8px;border:1px solid #2e2a20">
    <a href="${settingsUrl}" style="color:#E8A830;font-size:13px;text-decoration:none">
      Change alert settings
    </a>
    &nbsp;&middot;&nbsp;
    <a href="${pauseUrl}" style="color:#8b7f66;font-size:13px;text-decoration:none">
      Pause all alerts
    </a>
  </div>

  <p style="margin-top:20px;font-size:12px;color:#56503f">
    You're receiving this because you're tracking companies on
    <a href="${APP_URL}" style="color:#8b7f66">Crush</a>.
  </p>

  <!-- open tracking pixel -->
  <img src="${pixelUrl}" width="1" height="1" style="border:0;display:block;width:1px;height:1px" alt="" />
</body>
</html>`;
}
