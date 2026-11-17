import { NextRequest } from "next/server";
import { Resend } from "resend";
import { runCoverageCheck } from "@/lib/coverage";

export const maxDuration = 300;

const ALERT_BELOW = 0.95;

/**
 * Nightly: are we holding the roles that are actually live? Records the
 * result in coverage_checks; emails OWNER_EMAIL (if set) when coverage drops
 * below 95% or open roles we hold are no longer live.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const r = await runCoverageCheck();
  const pct = (r.coverage * 100).toFixed(1);
  const owner = process.env.OWNER_EMAIL;

  if (owner && process.env.RESEND_API_KEY && (r.coverage < ALERT_BELOW || r.staleActive > 0)) {
    const lines = (r.details as { name: string; live: number; missing: number; stale: number; drift: number }[])
      .map((d) => `${d.name}: ${d.missing} of ${d.live} live roles missing, ${d.stale} closed-but-shown, ${d.drift} retitled`)
      .join("\n");
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: "Crush <alerts@crushco.app>",
      to: owner,
      subject: `Crush coverage ${pct}% — ${r.liveRoles - r.present} live roles missing`,
      text: `Sampled ${r.companies} job boards after this morning's ingest.\n\nCoverage: ${pct}% (${r.present} of ${r.liveRoles} live roles held as open)\nShown as open but gone from the board: ${r.staleActive}\nTitle changed since we stored it: ${r.titleDrift}\n\nWorst companies:\n${lines}`,
    });
  }

  return Response.json({ coverage: r.coverage, companies: r.companies, liveRoles: r.liveRoles, present: r.present, staleActive: r.staleActive, titleDrift: r.titleDrift });
}
