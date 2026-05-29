/**
 * speed-test-export.ts
 *
 * Exports recent Crush job postings to a CSV so you can manually record
 * when the same jobs appeared on LinkedIn, then measure the actual time delta.
 *
 * HOW TO USE:
 *   1. Run:  npx dotenv-cli -e .env.local -- npx tsx scripts/speed-test-export.ts > speed-test.csv
 *   2. Open speed-test.csv in a spreadsheet
 *   3. For each row, search LinkedIn Jobs for the job title + company name
 *   4. Record the LinkedIn posting date in the "linkedin_posted_at" column
 *   5. The delta column will auto-calculate in spreadsheet: =IF(E2<>"", (C2-E2)*24, "")
 *      (gives hours; negative = Crush was faster)
 *   6. Average the delta column for your true speed advantage
 *
 * Run frequently to get a rolling sample of 30 days of postings.
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30 days

  const jobs = await prisma.job.findMany({
    where: {
      status: "ACTIVE",
      postedAt: { gte: since },
    },
    include: { company: { select: { name: true, slug: true } } },
    orderBy: { postedAt: "desc" },
    take: 100,
  });

  // CSV header
  console.log([
    "company",
    "job_title",
    "crush_posted_at",
    "job_url",
    "linkedin_posted_at",        // <-- fill this in manually
    "delta_hours_crush_faster",  // <-- calculate: (crush - linkedin) in hours; positive = LinkedIn was slower
  ].join(","));

  for (const job of jobs) {
    const row = [
      `"${job.company.name.replace(/"/g, '""')}"`,
      `"${job.title.replace(/"/g, '""')}"`,
      job.postedAt?.toISOString() ?? "",
      job.url ? `"${job.url}"` : "",
      "",  // linkedin_posted_at — fill manually
      "",  // delta — calculate in spreadsheet
    ];
    console.log(row.join(","));
  }

  process.stderr.write(`\nExported ${jobs.length} jobs from the last 30 days.\n`);
  process.stderr.write(`Next step: open the CSV and check each job on LinkedIn Jobs.\n`);
  process.stderr.write(`Search: site:linkedin.com/jobs "${jobs[0]?.title}" "${jobs[0]?.company.name}"\n\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
