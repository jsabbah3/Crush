/**
 * Run ATS detection on all manual companies that have a website set.
 * Updates sourceType + sourceId when a live ATS board is found.
 * Usage: npx dotenv-cli -e .env.local -- npx tsx scripts/detect-ats-manual.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { detectAts } from "../src/lib/detect-ats";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const companies = await prisma.company.findMany({
    where: { sourceType: "manual", website: { not: null } },
    select: { id: true, name: true, website: true },
    orderBy: { name: "asc" },
  });

  console.log(`Checking ${companies.length} manual companies for ATS boards...\n`);

  let found = 0;
  let notFound = 0;

  for (const company of companies) {
    process.stdout.write(`  ${company.name.padEnd(40)}`);
    try {
      const result = await detectAts(company.name, company.website ?? undefined);
      if (result) {
        await prisma.company.update({
          where: { id: company.id },
          data: { sourceType: result.type, sourceId: result.slug },
        });
        console.log(`✓ ${result.type}/${result.slug}  (${result.jobCount} jobs)`);
        found++;
      } else {
        console.log(`— no ATS detected`);
        notFound++;
      }
    } catch (err) {
      console.log(`✗ error: ${err instanceof Error ? err.message : String(err)}`);
      notFound++;
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`Found:     ${found}`);
  console.log(`Not found: ${notFound}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
