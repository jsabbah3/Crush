import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

type MatchWithDetails = {
  id: string;
  job: {
    title: string;
    url: string | null;
    location: string | null;
    remote: boolean;
    type: string;
  };
  trackedCompany: {
    company: { name: string };
    user: { email: string; name: string | null };
  };
};

export async function sendMatchNotifications(matchIds: string[]) {
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds }, notified: false },
    include: {
      job: { select: { title: true, url: true, location: true, remote: true, type: true } },
      trackedCompany: {
        include: {
          company: { select: { name: true } },
          user: { select: { email: true, name: true } },
        },
      },
    },
  });

  // Group matches by user
  const byUser = new Map<string, MatchWithDetails[]>();
  for (const match of matches) {
    const email = match.trackedCompany.user.email;
    if (!byUser.has(email)) byUser.set(email, []);
    byUser.get(email)!.push(match as MatchWithDetails);
  }

  const sentIds: string[] = [];

  for (const [email, userMatches] of byUser) {
    const userName = userMatches[0].trackedCompany.user.name ?? "there";
    const html = buildEmailHtml(userName, userMatches);

    const { error } = await resend.emails.send({
      from: "Crush <alerts@crush.so>",
      to: email,
      subject: `${userMatches.length} new role${userMatches.length > 1 ? "s" : ""} at companies you're tracking`,
      html,
    });

    if (!error) {
      sentIds.push(...userMatches.map((m) => m.id));
    }
  }

  if (sentIds.length > 0) {
    await prisma.match.updateMany({
      where: { id: { in: sentIds } },
      data: { notified: true, notifiedAt: new Date() },
    });
  }
}

function buildEmailHtml(name: string, matches: MatchWithDetails[]): string {
  const rows = matches
    .map((m) => {
      const loc = m.job.remote ? "Remote" : (m.job.location ?? "Unknown");
      const link = m.job.url
        ? `<a href="${m.job.url}" style="color:#6366f1">${m.job.title}</a>`
        : m.job.title;
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb">
          ${link}<br/>
          <span style="color:#6b7280;font-size:13px">${m.trackedCompany.company.name} · ${loc}</span>
        </td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827">
  <h2 style="margin-bottom:4px">Hi ${name},</h2>
  <p style="color:#6b7280">New roles just opened at companies you're tracking:</p>
  <table style="width:100%;border-collapse:collapse;margin-top:16px">${rows}</table>
  <p style="margin-top:24px;font-size:13px;color:#9ca3af">
    You're receiving this because you're tracking these companies on Crush.
  </p>
</body>
</html>`;
}
