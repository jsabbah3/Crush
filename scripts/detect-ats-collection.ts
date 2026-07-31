/**
 * Run ATS detection over the companies in a single collection.
 * Dry-run by default; pass --apply to write sourceType/sourceId.
 *
 * Usage:
 *   npx tsx scripts/detect-ats-collection.ts best-companies-for-salespeople
 *   npx tsx scripts/detect-ats-collection.ts best-companies-for-salespeople --apply
 *
 * By default only companies with no live board are probed (manual, or an ATS
 * source that currently yields zero active jobs). Pass --all to re-probe every
 * company in the collection.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import { detectAts } from "../src/lib/detect-ats";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

const collectionSlug = process.argv[2];
const apply = process.argv.includes("--apply");
const probeAll = process.argv.includes("--all");

async function main() {
  if (!collectionSlug) {
    console.error("Usage: npx tsx scripts/detect-ats-collection.ts <collection-slug> [--apply] [--all]");
    process.exit(1);
  }

  const collection = await prisma.collection.findUnique({
    where: { slug: collectionSlug },
    include: {
      companies: {
        orderBy: { displayOrder: "asc" },
        include: { company: { select: { id: true, name: true, website: true, sourceType: true, sourceId: true } } },
      },
    },
  });

  if (!collection) {
    console.error(`No collection with slug "${collectionSlug}".`);
    process.exit(1);
  }

  console.log(`Collection: ${collection.name} (${collection.companies.length} companies)`);
  console.log(apply ? "Mode: APPLY — writes sourceType/sourceId\n" : "Mode: DRY RUN — no writes\n");

  let found = 0;
  let missed = 0;
  let skipped = 0;

  for (const { company } of collection.companies) {
    const activeJobs = await prisma.job.count({ where: { companyId: company.id, status: "ACTIVE" } });

    if (!probeAll && activeJobs > 0) {
      console.log(`  ${company.name.padEnd(16)} — skip (${activeJobs} active jobs via ${company.sourceType}/${company.sourceId})`);
      skipped++;
      continue;
    }

    process.stdout.write(`  ${company.name.padEnd(16)} `);
    try {
      const result = await detectAts(company.name, company.website);
      if (result) {
        if (apply) {
          await prisma.company.update({
            where: { id: company.id },
            data: { sourceType: result.type, sourceId: result.slug },
          });
        }
        const was = `${company.sourceType}${company.sourceId ? `/${company.sourceId}` : ""}`;
        console.log(`✓ ${result.type}/${result.slug} (${result.jobCount} jobs)   [was ${was}]`);
        found++;
      } else {
        console.log(`— no ATS board found   (website: ${company.website ?? "none set"})`);
        missed++;
      }
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : String(err)}`);
      missed++;
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`Detected:  ${found}`);
  console.log(`No board:  ${missed}`);
  console.log(`Skipped:   ${skipped}`);
  if (found && !apply) console.log(`\nRe-run with --apply to persist.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
