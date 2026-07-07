/**
 * normalize-industries.ts
 *
 * Collapses duplicate/variant company.industry values into a canonical
 * taxonomy so the browse filters don't show "AI" and "Artificial Intelligence"
 * as separate chips.
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/normalize-industries.ts          # dry run
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/normalize-industries.ts --apply  # write changes
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

// variant → canonical. Values not listed here are left untouched.
const CANONICAL: Record<string, string> = {
  "AI": "Artificial Intelligence",
  "Data & AI": "Artificial Intelligence",

  "Biotech / AI": "Healthcare",

  "Infrastructure": "Cloud Infrastructure",
  "Data Infrastructure": "Cloud Infrastructure",
  "Software & Cloud": "Cloud Infrastructure",

  "Financial Technology": "Fintech",
  "Fintech / AI": "Fintech",

  "Streaming": "Entertainment",

  "E-commerce": "E-Commerce",
  "E-Commerce & Cloud": "E-Commerce",
  "Grocery Delivery": "E-Commerce",

  "Semiconductors": "Hardware & Semiconductors",

  "Travel": "Travel & Hospitality",

  "Enterprise Technology": "Enterprise Software",
  "SaaS": "Enterprise Software",
  "SaaS / CRM": "Enterprise Software",
  "Customer Service": "Enterprise Software",

  "Human Resources": "HR & Recruiting",
  "HR Tech": "HR & Recruiting",

  "Logistics": "Logistics & Transportation",
  "Transportation": "Logistics & Transportation",
  "Ride-Sharing": "Logistics & Transportation",
  "Autonomous Vehicles": "Logistics & Transportation",

  "Marketing Technology": "Marketing & Sales",
  "Sales Technology": "Marketing & Sales",
  "Search & Advertising": "Marketing & Sales",

  "Robotics": "Robotics & Defense",
  "Robotics / AI": "Robotics & Defense",
  "Defense Technology": "Robotics & Defense",

  "Consumer": "Consumer & Social",
  "Consumer Technology": "Consumer & Social",
  "Social Media": "Consumer & Social",
  "Social": "Consumer & Social",
  "Professional Network": "Consumer & Social",

  "Legal Technology": "Legal",

  "Design Tools": "Design & Creative",
  "Creative Software": "Design & Creative",
};

async function main() {
  const apply = process.argv.includes("--apply");

  let total = 0;
  for (const [from, to] of Object.entries(CANONICAL)) {
    const count = await prisma.company.count({ where: { industry: from } });
    if (count === 0) continue;
    total += count;
    console.log(`${apply ? "✓" : "would"} ${from.padEnd(24)} → ${to.padEnd(28)} (${count})`);
    if (apply) {
      await prisma.company.updateMany({ where: { industry: from }, data: { industry: to } });
    }
  }

  console.log(`\n${apply ? "Updated" : "Would update"} ${total} companies.`);
  if (!apply) console.log("Re-run with --apply to write changes.");

  const remaining = await prisma.company.groupBy({
    by: ["industry"],
    where: { industry: { not: null } },
    _count: true,
    orderBy: { _count: { industry: "desc" } },
  });
  console.log(`\n${apply ? "Canonical" : "Projected canonical"} set (${remaining.length} values currently in DB).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
