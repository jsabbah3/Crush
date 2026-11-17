/**
 * One-off: run ATS ingestion for every sourced company, a few at a time.
 * Same work the daily ingest cron does, without its 5-minute limit — for
 * catch-up runs after an ingestion change (e.g. reopening reused postings).
 *
 *   npx tsx --env-file=.env.local scripts/ingest-ats-catchup.ts
 */
import { prisma } from "../src/lib/prisma";
import { ingestCompanyById } from "../src/lib/ingestion";

const CONCURRENCY = 6;

async function main() {
  const companies = await prisma.company.findMany({
    where: { sourceType: { in: ["greenhouse", "lever", "ashby", "gem"] }, sourceId: { not: null } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const activeBefore = await prisma.job.count({ where: { status: "ACTIVE" } });
  let done = 0, newJobs = 0, newMatches = 0;
  const errors: string[] = [];
  const queue = [...companies];

  async function worker() {
    for (let c = queue.shift(); c; c = queue.shift()) {
      try {
        const r = await ingestCompanyById(c.id);
        newJobs += r.newJobs;
        newMatches += r.newMatches;
      } catch (e) {
        errors.push(`${c.name}: ${(e as Error).message.slice(0, 120)}`);
      }
      if (++done % 100 === 0) console.log(`${done}/${companies.length} companies · ${newJobs} new jobs · ${newMatches} new matches`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const activeAfter = await prisma.job.count({ where: { status: "ACTIVE" } });
  console.log(`Done: ${companies.length} companies. Active jobs ${activeBefore} → ${activeAfter}. New jobs ${newJobs}, new matches ${newMatches}, errors ${errors.length}.`);
  for (const e of errors.slice(0, 20)) console.log("  ", e);
}

main().finally(() => prisma.$disconnect());
