import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { trackServerEvent } from "@/lib/analytics-node";

// Lazily constructed — see notifications.ts: a module-level Resend client
// makes the build require RESEND_API_KEY, which it shouldn't.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const APP_URL = process.env.APP_URL ?? "https://crushco.app";
const BATCH_SIZE = 100; // Resend batch limit

type WeeklyPayload = {
  user: {
    id: string;
    email: string;
    name: string | null;
    unsubscribeToken: string;
  };
  companiesChecked: number;
  newRolesPosted: number;
  matches: {
    jobTitle: string;
    companyName: string;
    companySlug: string;
    jobUrl: string | null;
    location: string | null;
    remote: boolean;
  }[];
  trending: {
    name: string;
    slug: string;
    newJobs: number;
  }[];
  inProcessCount: number; // APPLIED or INTERVIEWING across all time
};

export async function sendWeeklySummary(): Promise<{
  sent: number;
  skipped: number;
  errors: number;
}> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // ── 1. Eligible users ────────────────────────────────────────────────────────
  const users = await prisma.user.findMany({
    where: {
      alertsPaused: false,
      tracked: { some: {} },
    },
    select: {
      id: true,
      email: true,
      name: true,
      unsubscribeToken: true,
      tracked: {
        select: {
          companyId: true,
          company: { select: { name: true, slug: true } },
        },
      },
    },
  });

  if (users.length === 0) return { sent: 0, skipped: 0, errors: 0 };

  // ── 2. New job counts per company (last 7 days) ──────────────────────────────
  const allCompanyIds = [...new Set(users.flatMap((u) => u.tracked.map((t) => t.companyId)))];

  const jobCountRows = await prisma.job.groupBy({
    by: ["companyId"],
    where: { companyId: { in: allCompanyIds }, createdAt: { gte: since } },
    _count: { id: true },
  });
  const jobCountByCompanyId = new Map(jobCountRows.map((r) => [r.companyId, r._count.id]));

  // ── 3. All week's matches for eligible users ─────────────────────────────────
  const weekMatches = await prisma.match.findMany({
    where: {
      createdAt: { gte: since },
      dismissed: false,
      trackedCompany: { userId: { in: users.map((u) => u.id) } },
    },
    select: {
      trackedCompany: {
        select: {
          userId: true,
          company: { select: { name: true, slug: true } },
        },
      },
      job: { select: { title: true, url: true, location: true, remote: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const matchesByUserId = new Map<string, typeof weekMatches>();
  for (const m of weekMatches) {
    const uid = m.trackedCompany.userId;
    if (!matchesByUserId.has(uid)) matchesByUserId.set(uid, []);
    matchesByUserId.get(uid)!.push(m);
  }

  // ── 4. In-process applications per user (APPLIED or INTERVIEWING, all time) ──
  const inProcessMatches = await prisma.match.findMany({
    where: {
      applicationStatus: { in: ["APPLIED", "INTERVIEWING"] },
      trackedCompany: { userId: { in: users.map((u) => u.id) } },
    },
    select: { trackedCompany: { select: { userId: true } } },
  });

  const inProcessByUserId = new Map<string, number>();
  for (const m of inProcessMatches) {
    const uid = m.trackedCompany.userId;
    inProcessByUserId.set(uid, (inProcessByUserId.get(uid) ?? 0) + 1);
  }

  // ── 5. Trending companies this week (global top 5) ───────────────────────────
  const trendingGroups = await prisma.job.groupBy({
    by: ["companyId"],
    where: { createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  const trendingCompanies =
    trendingGroups.length > 0
      ? await prisma.company.findMany({
          where: { id: { in: trendingGroups.map((g) => g.companyId) } },
          select: { id: true, name: true, slug: true },
        })
      : [];

  const trendingById = new Map(trendingCompanies.map((c) => [c.id, c]));
  const trending = trendingGroups
    .map((g) => {
      const company = trendingById.get(g.companyId);
      if (!company) return null;
      return { name: company.name, slug: company.slug, newJobs: g._count.id };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  // ── 6. Build per-user payloads ───────────────────────────────────────────────
  const payloads: WeeklyPayload[] = users.map((user) => {
    const userMatches = matchesByUserId.get(user.id) ?? [];
    const newRolesPosted = user.tracked.reduce(
      (sum, t) => sum + (jobCountByCompanyId.get(t.companyId) ?? 0),
      0,
    );

    return {
      user: { id: user.id, email: user.email, name: user.name, unsubscribeToken: user.unsubscribeToken },
      companiesChecked: user.tracked.length,
      newRolesPosted,
      matches: userMatches.map((m) => ({
        jobTitle: m.job.title,
        companyName: m.trackedCompany.company.name,
        companySlug: m.trackedCompany.company.slug,
        jobUrl: m.job.url,
        location: m.job.location,
        remote: m.job.remote,
      })),
      trending,
      inProcessCount: inProcessByUserId.get(user.id) ?? 0,
    };
  });

  // ── 7. Send in batches of 100 ────────────────────────────────────────────────
  let sent = 0;
  let errors = 0;

  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const chunk = payloads.slice(i, i + BATCH_SIZE);
    const emails = chunk.map((p) => buildEmailPayload(p));

    const { error } = await getResend().batch.send(emails);
    if (error) {
      errors += chunk.length;
    } else {
      sent += chunk.length;
      // Fire analytics for each user in this chunk
      await Promise.all(
        chunk.map((p) =>
          trackServerEvent(p.user.id, "weekly_digest_sent", {
            match_count: p.matches.length,
            in_process_count: p.inProcessCount,
          }),
        ),
      );
    }
  }

  return { sent, skipped: 0, errors };
}

// ─── Email builder ────────────────────────────────────────────────────────────

function emailLink(dest: string, uid: string, type: string): string {
  const utmDest = `${dest}${dest.includes("?") ? "&" : "?"}utm_source=email&utm_medium=email&utm_campaign=${type}`;
  return `${APP_URL}/api/email/click?uid=${uid}&type=${type}&url=${encodeURIComponent(utmDest)}`;
}

function buildEmailPayload(p: WeeklyPayload) {
  const name = p.user.name ?? "there";
  const hasMatches = p.matches.length > 0;
  const subject = hasMatches
    ? `Your week on Crush — ${p.matches.length} new match${p.matches.length > 1 ? "es" : ""}`
    : "Your weekly Crush update — here's what's trending";

  return {
    from: "Crush <weekly@crushco.app>",
    to: p.user.email,
    subject,
    html: buildHtml(name, p),
    headers: {
      "List-Unsubscribe": `<${APP_URL}/api/unsubscribe?token=${p.user.unsubscribeToken}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

function buildHtml(name: string, p: WeeklyPayload): string {
  const { companiesChecked, newRolesPosted, matches, trending, inProcessCount } = p;
  const { id: userId, unsubscribeToken: token } = p.user;
  const hasMatches = matches.length > 0;

  const pauseUrl = `${APP_URL}/api/unsubscribe?token=${token}`;
  const settingsUrl = emailLink(`${APP_URL}/settings`, userId, "weekly_summary");
  const companiesUrl = emailLink(`${APP_URL}/companies`, userId, "weekly_summary");
  const collectionsUrl = emailLink(`${APP_URL}/collections`, userId, "weekly_summary");
  const applicationsUrl = emailLink(`${APP_URL}/applications`, userId, "weekly_summary");
  const pixelUrl = `${APP_URL}/api/email/pixel?uid=${userId}&type=weekly_summary`;

  // Stats pills
  const stats = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-collapse:separate;border-spacing:8px">
      <tr>
        ${statCell(String(companiesChecked), "companies tracked")}
        ${statCell(String(newRolesPosted), "new roles posted")}
        ${statCell(String(matches.length), "matched your criteria")}
      </tr>
    </table>`;

  // Match list or zero-match nudge
  const matchSection = hasMatches
    ? `
    <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#f2eddf">Your matches this week</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      ${matches
        .map((m) => {
          const loc = m.remote ? "Remote" : (m.location ?? "");
          const rawCompanyUrl = `${APP_URL}/companies/${m.companySlug}`;
          const companyUrl = emailLink(rawCompanyUrl, userId, "weekly_summary");
          const applyUrl = emailLink(m.jobUrl ?? rawCompanyUrl, userId, "weekly_summary");
          return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #2e2a20">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:14px;font-weight:600;color:#f2eddf">${escHtml(m.jobTitle)}</span><br/>
                  <span style="font-size:13px;color:#8b7f66">
                    <a href="${companyUrl}" style="color:#8b7f66;text-decoration:none">${escHtml(m.companyName)}</a>${loc ? ` &middot; ${escHtml(loc)}` : ""}
                  </span>
                </td>
                <td style="text-align:right;white-space:nowrap">
                  <a href="${applyUrl}" style="display:inline-block;padding:6px 14px;background:#E8A830;color:#0d0c09;font-size:13px;font-weight:600;border-radius:6px;text-decoration:none">Apply →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
        })
        .join("")}
    </table>`
    : `
    <div style="background:#1a1813;border:1px solid #2e2a20;border-radius:12px;padding:24px;margin:0 0 8px">
      <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#f2eddf">No matches this week.</p>
      <p style="margin:0 0 20px;font-size:14px;color:#8b7f66;line-height:1.6">
        We scanned ${newRolesPosted > 0 ? `<strong style="color:#f2eddf">${newRolesPosted} new role${newRolesPosted === 1 ? "" : "s"}</strong> across` : "all of"} your ${companiesChecked} tracked ${companiesChecked === 1 ? "company" : "companies"} — nothing matched your criteria yet.
        ${newRolesPosted > 0
          ? "There's activity out there; your filters might just be narrowing it down."
          : "It's been a quiet week for your companies. Try tracking more to cast a wider net."}
      </p>
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:8px">
          <a href="${companiesUrl}" style="display:inline-block;padding:9px 18px;background:#E8A830;color:#0d0c09;font-size:13px;font-weight:600;border-radius:8px;text-decoration:none">Track more companies</a>
        </td>
        <td>
          <a href="${collectionsUrl}" style="display:inline-block;padding:9px 18px;background:#272318;color:#f2eddf;font-size:13px;font-weight:500;border-radius:8px;text-decoration:none;border:1px solid #2e2a20">Browse collections</a>
        </td>
      </tr></table>
    </div>`;

  // In-process callout
  const inProcessSection =
    inProcessCount > 0
      ? `
    <div style="margin-top:24px;padding:14px 16px;background:#1a1813;border:1px solid #E8A830;border-radius:10px">
      <span style="font-size:14px;color:#f2eddf;font-weight:500">
        You're in process with ${inProcessCount} ${inProcessCount === 1 ? "company" : "companies"} right now.
      </span>
      &nbsp;
      <a href="${applicationsUrl}" style="font-size:13px;color:#E8A830;text-decoration:none;white-space:nowrap">View applications →</a>
    </div>`
      : "";

  // Trending section
  const trendingSection =
    trending.length > 0
      ? `
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #2e2a20">
      <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#f2eddf">Trending this week</p>
      <p style="margin:0 0 16px;font-size:13px;color:#8b7f66">Companies posting the most new roles right now</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${trending
          .map(
            (t) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1a1813">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <a href="${APP_URL}/companies/${t.slug}" style="font-size:14px;font-weight:500;color:#f2eddf;text-decoration:none">${escHtml(t.name)}</a>
              </td>
              <td style="text-align:right">
                <span style="font-size:13px;color:#8b7f66">${t.newJobs} new role${t.newJobs === 1 ? "" : "s"}</span>
              </td>
            </tr></table>
          </td>
        </tr>`,
          )
          .join("")}
      </table>
    </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:580px;margin:0 auto;padding:40px 24px;color:#f2eddf;background:#0d0c09;-webkit-font-smoothing:antialiased">

  <!-- Header -->
  <p style="margin:0 0 10px;font-size:13px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#E8A830">Crush</p>
  <p style="margin:0 0 6px;font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#8b7f66">Weekly update</p>
  <p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#f2eddf">Hi ${escHtml(name)},</p>
  <p style="margin:0;font-size:15px;color:#8b7f66">Here's what happened at the companies you're tracking this week.</p>

  <!-- Stats -->
  ${stats}

  <!-- Matches or zero-match nudge -->
  ${matchSection}

  <!-- In-process callout -->
  ${inProcessSection}

  <!-- Trending -->
  ${trendingSection}

  <!-- Footer -->
  <div style="margin-top:36px;padding-top:20px;border-top:1px solid #2e2a20">
    <p style="margin:0 0 8px;font-size:13px;color:#8b7f66">
      <a href="${settingsUrl}" style="color:#8b7f66;text-decoration:underline">Email preferences</a>
      &nbsp;&middot;&nbsp;
      <a href="${pauseUrl}" style="color:#56503f;text-decoration:underline">Unsubscribe</a>
    </p>
    <p style="margin:0;font-size:12px;color:#56503f">
      Sent by <a href="${APP_URL}" style="color:#8b7f66">Crush</a> &middot; You're receiving this because you're tracking companies.
    </p>
  </div>

  <!-- open tracking pixel -->
  <img src="${pixelUrl}" width="1" height="1" style="border:0;display:block;width:1px;height:1px" alt="" />

</body>
</html>`;
}

function statCell(value: string, label: string): string {
  return `
    <td width="33%" style="background:#1a1813;border:1px solid #2e2a20;border-radius:10px;padding:16px 12px;text-align:center">
      <div style="font-size:26px;font-weight:700;color:#f2eddf;line-height:1">${value}</div>
      <div style="font-size:12px;color:#8b7f66;margin-top:4px;line-height:1.3">${label}</div>
    </td>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
