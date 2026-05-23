import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { AlertMode } from "@/generated/prisma/enums";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL ?? "https://crush.so";

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

    const { email, name, unsubscribeToken } = matches[0].trackedCompany.user;
    const ok = await sendEmail({
      to: email,
      name,
      matches,
      subject: `${matches.length} new role${matches.length > 1 ? "s" : ""} at companies you're tracking`,
      unsubscribeToken,
    });

    if (ok) {
      await markNotified(matches.map((m) => m.id));
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
    const { email, name, unsubscribeToken } = matches[0].trackedCompany.user;
    const ok = await sendEmail({
      to: email,
      name,
      matches,
      subject: `Your daily job digest — ${matches.length} new match${matches.length > 1 ? "es" : ""}`,
      unsubscribeToken,
    });

    if (ok) {
      await markNotified(matches.map((m) => m.id));
      sent += matches.length;
    } else {
      errors++;
    }
  }

  return { sent, errors };
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
  to,
  name,
  matches,
  subject,
  unsubscribeToken,
}: {
  to: string;
  name: string | null;
  matches: MatchRow[];
  subject: string;
  unsubscribeToken: string;
}): Promise<boolean> {
  const { error } = await resend.emails.send({
    from: "Crush <alerts@crush.so>",
    to,
    subject,
    html: buildHtml(name ?? "there", matches, unsubscribeToken),
    headers: {
      "List-Unsubscribe": `<${APP_URL}/api/unsubscribe?token=${unsubscribeToken}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  return !error;
}

function buildHtml(name: string, matches: MatchRow[], token: string): string {
  const rows = matches
    .map((m) => {
      const loc = m.job.remote ? "Remote" : (m.job.location ?? "Location not listed");
      const link = m.job.url
        ? `<a href="${m.job.url}" style="color:#6366f1;font-weight:500">${m.job.title}</a>`
        : `<strong>${m.job.title}</strong>`;
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6">
            ${link}<br/>
            <span style="color:#6b7280;font-size:13px">${m.trackedCompany.company.name} &middot; ${loc}</span>
          </td>
        </tr>`;
    })
    .join("");

  const pauseUrl = `${APP_URL}/api/unsubscribe?token=${token}`;
  const settingsUrl = `${APP_URL}/settings`;

  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827;background:#fff">
  <p style="margin:0 0 4px;font-size:20px;font-weight:600">Hi ${name},</p>
  <p style="margin:0 0 24px;color:#6b7280;font-size:15px">New roles just opened at companies you're tracking:</p>

  <table style="width:100%;border-collapse:collapse">${rows}</table>

  <div style="margin-top:28px;padding:16px;background:#f9fafb;border-radius:8px">
    <a href="${settingsUrl}" style="color:#6366f1;font-size:13px;text-decoration:none">
      Change alert settings
    </a>
    &nbsp;&middot;&nbsp;
    <a href="${pauseUrl}" style="color:#9ca3af;font-size:13px;text-decoration:none">
      Pause all alerts
    </a>
  </div>

  <p style="margin-top:20px;font-size:12px;color:#d1d5db">
    You're receiving this because you're tracking companies on
    <a href="${APP_URL}" style="color:#d1d5db">Crush</a>.
  </p>
</body>
</html>`;
}
