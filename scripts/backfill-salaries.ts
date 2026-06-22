/**
 * Backfill salary on existing ACTIVE jobs by parsing their descriptions.
 * Jobs ingested before salary parsing went live never got parsed — this
 * runs parseSalary() over their stored descriptions and saves any hits.
 *
 * Dry run (default):  npx tsx --env-file=.env.local scripts/backfill-salaries.ts
 * Apply:              npx tsx --env-file=.env.local scripts/backfill-salaries.ts --apply
 */
import { prisma } from "../src/lib/prisma";
import { parseSalary } from "../src/lib/ingestion/normalize";

const APPLY = process.argv.includes("--apply");
const BATCH = 1000;

async function main() {
  const total = await prisma.job.count({
    where: { status: "ACTIVE", salaryMin: null, description: { not: "" } },
  });
  console.log(`${total} salary-less active jobs to scan. Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

  let scanned = 0, updated = 0, cursor: string | undefined;

  while (true) {
    const jobs = await prisma.job.findMany({
      where: { status: "ACTIVE", salaryMin: null, description: { not: "" } },
      select: { id: true, description: true },
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (jobs.length === 0) break;
    cursor = jobs[jobs.length - 1].id;
    scanned += jobs.length;

    for (const j of jobs) {
      const salary = parseSalary(j.description);
      if (salary) {
        updated++;
        if (APPLY) {
          await prisma.job.update({
            where: { id: j.id },
            data: { salaryMin: salary.min, salaryMax: salary.max, currency: salary.currency },
          });
        }
      }
    }
    process.stdout.write(`\rScanned ${scanned}/${total} · would update ${updated}`);
  }

  console.log(`\n\nDone. ${APPLY ? "Updated" : "Would update"} ${updated} jobs.`);
  if (!APPLY && updated > 0) console.log("Re-run with --apply to save.");
  await prisma.$disconnect();
}

main().catch(console.error);
