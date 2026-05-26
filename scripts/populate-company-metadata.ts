/**
 * Infer and populate company size and funding stage from existing tags.
 *
 * Usage: npx tsx scripts/populate-company-metadata.ts [--dry-run]
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient, type CompanySize, type FundingStage } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });
const DRY_RUN = process.argv.includes("--dry-run");

const FUNDING_PATTERNS: [RegExp, FundingStage][] = [
  [/pre[\s-]?seed/i, "pre_seed"],
  [/\bseed\b/i, "seed"],
  [/series[\s-]?a\b/i, "series_a"],
  [/series[\s-]?b\b/i, "series_b"],
  [/series[\s-]?c\b/i, "series_c"],
  [/series[\s-]?[d-f]\b|growth[\s-]?stage|late[\s-]?stage/i, "growth"],
  [/\bpublic\b|nasdaq|nyse|\bipo\b/i, "public"],
];

const SIZE_PATTERNS: [RegExp, CompanySize][] = [
  [/\bstartup\b|early[\s-]?stage/i, "startup"],
  [/\bsmall\b|smb/i, "small"],
  [/mid[\s-]?size|medium/i, "medium"],
  [/\blarge\b|enterprise|fortune\s*500/i, "large"],
];

function inferFromTags(tags: string[]): { fundingStage: FundingStage | null; size: CompanySize | null } {
  const text = tags.join(" ").toLowerCase();
  let fundingStage: FundingStage | null = null;
  let size: CompanySize | null = null;

  for (const [pattern, stage] of FUNDING_PATTERNS) {
    if (pattern.test(text)) { fundingStage = stage; break; }
  }
  for (const [pattern, s] of SIZE_PATTERNS) {
    if (pattern.test(text)) { size = s; break; }
  }

  // Derive size from funding stage when not explicit
  if (!size && fundingStage) {
    if (fundingStage === "pre_seed" || fundingStage === "seed") size = "startup";
    else if (fundingStage === "series_a") size = "small";
    else if (fundingStage === "series_b" || fundingStage === "series_c") size = "medium";
    else if (fundingStage === "growth" || fundingStage === "public") size = "large";
  }

  return { fundingStage, size };
}

async function main() {
  const companies = await prisma.company.findMany({
    where: {
      OR: [{ fundingStage: null }, { size: null }],
      tags: { isEmpty: false },
    },
    select: { id: true, name: true, tags: true, fundingStage: true, size: true },
  });

  console.log(`Processing ${companies.length} companies with tags but incomplete metadata…`);
  let updated = 0;

  for (const company of companies) {
    const { fundingStage, size } = inferFromTags(company.tags);
    const changes: { fundingStage?: FundingStage; size?: CompanySize } = {};
    if (!company.fundingStage && fundingStage) changes.fundingStage = fundingStage;
    if (!company.size && size) changes.size = size;

    if (Object.keys(changes).length === 0) continue;

    console.log(`  ${company.name}: ${JSON.stringify(changes)}`);
    if (!DRY_RUN) {
      await prisma.company.update({ where: { id: company.id }, data: changes });
    }
    updated++;
  }

  console.log(`\nDone. Updated ${updated} companies.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
