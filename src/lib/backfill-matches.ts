import { prisma } from "@/lib/prisma";
import { doesJobMatch } from "@/lib/matching";

type UserPrefs = {
  seniority?: string[];
  remoteOnly?: boolean | null;
  locationFilter?: string | null;
};

/**
 * Create matches for a user's open roles that the matcher accepts but that
 * have no match row yet — after following a company, changing roles, or a
 * matcher change. Silent (notified: true): these roles were already open, so
 * they belong in the inbox but must not trigger a "just opened" email.
 *
 * Never un-dismisses: a dismissed match is the user saying "not for me" (or a
 * cleanup the user hasn't overridden), and a refresh must not undo that.
 *
 * @param companyIds only check these companies (follow flow); null = all.
 */
export async function backfillMatches(userId: string, companyIds: string[] | null) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultCriteria: true },
  });
  const prefs = dbUser?.defaultCriteria as UserPrefs | null;

  const roles = await prisma.trackedRole.findMany({
    where: { userId },
    select: { title: true },
  });
  const roleTitles = roles.map((r) => r.title);
  if (roleTitles.length === 0) return 0; // no roles set — nothing to match

  // Get the relevant TrackedCompany rows
  const trackedCompanies = await prisma.trackedCompany.findMany({
    where: {
      userId,
      ...(companyIds ? { companyId: { in: companyIds } } : {}),
    },
    select: { id: true, companyId: true },
  });
  if (trackedCompanies.length === 0) return 0;

  const trackedCompanyIds = trackedCompanies.map((tc) => tc.companyId);

  // Fetch active jobs for those companies
  const jobs = await prisma.job.findMany({
    where: {
      companyId: { in: trackedCompanyIds },
      status: "ACTIVE",
    },
  });

  // Build a map from companyId → trackedCompanyId
  const tcMap = new Map(trackedCompanies.map((tc) => [tc.companyId, tc.id]));

  let created = 0;
  for (const job of jobs) {
    if (!doesJobMatch(
      job,
      roleTitles,
      prefs?.seniority ?? [],
      prefs?.remoteOnly ?? null,
      prefs?.locationFilter ?? null,
    )) continue;

    const trackedCompanyId = tcMap.get(job.companyId);
    if (!trackedCompanyId) continue;

    const existing = await prisma.match.findFirst({ where: { trackedCompanyId, jobId: job.id } });
    if (!existing) {
      try {
        // notified: true — backfilled matches are for roles that were already
        // open when the user followed; they belong on the dashboard but must
        // not trigger a "just opened" alert email.
        await prisma.match.create({ data: { trackedCompanyId, jobId: job.id, notified: true } });
        created++;
      } catch {
        // Race condition — fine
      }
    }
  }
  return created;
}
