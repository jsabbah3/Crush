/**
 * Populate logoUrl for all companies that have a website.
 * Uses Clearbit's free logo API and validates the URL with a HEAD request.
 *
 * Usage: npx tsx scripts/fetch-logos.ts [--dry-run]
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes("--dry-run");

function clearbitLogoUrl(website: string): string | null {
  try {
    const host = new URL(website).hostname.replace(/^www\./, "");
    return `https://logo.clearbit.com/${host}`;
  } catch {
    return null;
  }
}

async function checkLogoExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const companies = await prisma.company.findMany({
    where: { website: { not: null }, logoUrl: null },
    select: { id: true, name: true, website: true },
  });

  console.log(`Processing ${companies.length} companies with no logo…`);

  let updated = 0;
  let notFound = 0;

  for (const company of companies) {
    const url = clearbitLogoUrl(company.website!);
    if (!url) continue;

    const exists = await checkLogoExists(url);
    if (!exists) {
      notFound++;
      continue;
    }

    if (!DRY_RUN) {
      await prisma.company.update({
        where: { id: company.id },
        data: { logoUrl: url },
      });
    }
    updated++;
    console.log(`  ✓ ${company.name} → ${url}`);
  }

  console.log(`\nDone. Updated: ${updated}, not found: ${notFound}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
