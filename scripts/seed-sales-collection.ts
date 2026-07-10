/**
 * Seeds the "Best Companies for Salespeople" collection.
 * Usage: npx tsx scripts/seed-sales-collection.ts
 * Safe to re-run — skips companies already in the collection.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

const COLLECTION = {
  name: "Best Companies for Salespeople",
  slug: "best-companies-for-salespeople",
  description:
    "High-velocity sales cultures, strong comp plans, real career growth. The companies where salespeople thrive — not just survive.",
};

// Companies to add, in display order
const COMPANY_NAMES = [
  "Salesforce",
  "HubSpot",
  "Gong",
  "Outreach",
  "Salesloft",
  "Apollo.io",
  "Seismic",
  "Highspot",
  "Clari",
  "LinkedIn",
  "Rippling",
  "Brex",
  "Stripe",
  "Monday.com",
  "ZoomInfo",
  "Zendesk",
  "Twilio",
  "Drift",
];

async function main() {
  // Upsert collection
  const collection = await prisma.collection.upsert({
    where: { slug: COLLECTION.slug },
    update: { name: COLLECTION.name, description: COLLECTION.description },
    create: COLLECTION,
  });
  console.log(`✓ Collection: "${collection.name}" (${collection.id})`);

  // Resolve company IDs
  const companies = await prisma.company.findMany({
    where: { name: { in: COMPANY_NAMES } },
    select: { id: true, name: true },
  });

  const found = new Set(companies.map((c) => c.name));
  const missing = COMPANY_NAMES.filter((n) => !found.has(n));
  if (missing.length) {
    console.warn(`⚠ Companies not found in DB (skipping): ${missing.join(", ")}`);
  }

  // Sort by desired display order
  const ordered = COMPANY_NAMES.flatMap((name) => {
    const match = companies.find((c) => c.name === name);
    return match ? [match] : [];
  });

  // Upsert collection–company links
  for (let i = 0; i < ordered.length; i++) {
    const company = ordered[i];
    await prisma.collectionCompany.upsert({
      where: {
        collectionId_companyId: {
          collectionId: collection.id,
          companyId: company.id,
        },
      },
      update: { displayOrder: i },
      create: {
        collectionId: collection.id,
        companyId: company.id,
        displayOrder: i,
      },
    });
    console.log(`  + ${company.name}`);
  }

  console.log(`\nDone — ${ordered.length} companies added to "${collection.name}".`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
