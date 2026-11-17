/**
 * Create the matches every user should have for roles open right now —
 * after a matcher change that accepts more (e.g. location aliases), or for
 * users who followed companies before backfill-on-follow existed.
 *
 * Uses the same code as the app (lib/backfill-matches): silent matches (no
 * email), and never un-dismisses anything.
 *
 *   npx tsx --env-file=.env.local scripts/backfill-all-users.ts             # dry run
 *   npx tsx --env-file=.env.local scripts/backfill-all-users.ts --apply
 *   npx tsx --env-file=.env.local scripts/backfill-all-users.ts --user=<id>
 */
import { prisma } from "../src/lib/prisma";
import { doesJobMatch } from "../src/lib/matching";
import { backfillMatches } from "../src/lib/backfill-matches";

const APPLY = process.argv.includes("--apply");
const ONLY = process.argv.find((a) => a.startsWith("--user="))?.split("=")[1] ?? null;

type Prefs = { seniority?: string[]; remoteOnly?: boolean | null; locationFilter?: string | null } | null;

/** Dry run: how many open roles would get a new match row. */
async function wouldCreate(userId: string, prefs: Prefs): Promise<number> {
  const roles = (await prisma.trackedRole.findMany({ where: { userId }, select: { title: true } })).map((r) => r.title);
  if (!roles.length) return 0;
  const tracked = await prisma.trackedCompany.findMany({ where: { userId }, select: { id: true, companyId: true } });
  const jobs = await prisma.job.findMany({
    where: { companyId: { in: tracked.map((t) => t.companyId) }, status: "ACTIVE" },
    include: { matches: { where: { trackedCompanyId: { in: tracked.map((t) => t.id) } }, select: { id: true } } },
  });
  return jobs.filter(
    (j) => j.matches.length === 0 && doesJobMatch(j, roles, prefs?.seniority ?? [], prefs?.remoteOnly ?? null, prefs?.locationFilter ?? null),
  ).length;
}

async function main() {
  const users = await prisma.user.findMany({
    where: ONLY ? { id: ONLY } : undefined,
    select: { id: true, defaultCriteria: true },
  });
  let total = 0;
  for (const [i, u] of users.entries()) {
    const n = APPLY ? ((await backfillMatches(u.id, null)) ?? 0) : await wouldCreate(u.id, u.defaultCriteria as Prefs);
    if (n) console.log(`user #${i}: ${n} ${APPLY ? "created" : "would be created"}`);
    total += n;
  }
  console.log(`${APPLY ? "Created" : "Would create"} ${total} matches across ${users.length} users.${APPLY ? "" : " Pass --apply to write."}`);
}

main().finally(() => prisma.$disconnect());
