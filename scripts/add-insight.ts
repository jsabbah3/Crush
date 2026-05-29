/**
 * add-insight.ts
 *
 * CLI tool to add or update a company insight (insider hiring guide).
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/add-insight.ts \
 *     --company stripe \
 *     --slug getting-hired-at-stripe \
 *     --title "Getting hired at Stripe" \
 *     --author "Former Stripe Engineer" \
 *     --file insights/stripe.md
 *
 * The markdown file becomes the body of the insight.
 * Run again with the same --slug to overwrite.
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const companySlug = arg("--company");
  const slug = arg("--slug");
  const title = arg("--title");
  const author = arg("--author");
  const file = arg("--file");

  if (!companySlug || !slug || !title || !file) {
    console.error("Usage: add-insight.ts --company <slug> --slug <insight-slug> --title <title> --file <markdown-file> [--author <author>]");
    process.exit(1);
  }

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) {
    console.error(`Company not found: ${companySlug}`);
    process.exit(1);
  }

  const body = fs.readFileSync(path.resolve(file), "utf-8");

  await prisma.companyInsight.upsert({
    where: { slug },
    update: { title, body, author: author ?? null },
    create: {
      companyId: company.id,
      slug,
      title,
      body,
      author: author ?? null,
    },
  });

  console.log(`✓ Insight saved: "${title}" for ${company.name}`);
  console.log(`  View at: /companies/${companySlug}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
