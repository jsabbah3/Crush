/**
 * Validate ATS configuration for all non-manual companies.
 * Tests the configured ATS API for each company and flags ones that:
 *   - Return 404 / error
 *   - Return 0 jobs (possibly wrong slug or defunct)
 *
 * For broken companies, optionally tries the other ATS providers to find the right one.
 *
 * Usage:
 *   npx tsx scripts/validate-ats.ts               # dry-run, report only
 *   npx tsx scripts/validate-ats.ts --fix          # auto-fix when a better ATS is found
 *   npx tsx scripts/validate-ats.ts --limit=50    # only check first N companies
 *   npx tsx scripts/validate-ats.ts --company=OpenAI
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

const FIX    = process.argv.includes("--fix");
const LIMIT  = parseInt(process.argv.find(a => a.startsWith("--limit="))?.split("=")[1] ?? "9999");
const TARGET = process.argv.find(a => a.startsWith("--company="))?.split("=")[1];
const TIMEOUT = 8000;

type AtsType = "greenhouse" | "lever" | "ashby" | "gem";

const ATS_URLS: Record<AtsType, (slug: string) => string> = {
  greenhouse: (slug) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
  lever:      (slug) => `https://api.lever.co/v0/postings/${slug}?mode=json`,
  ashby:      (slug) => `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
  gem:        (slug) => `https://api.gem.com/job_board/v0/${encodeURIComponent(slug)}/job_posts/`,
};

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function probeAts(type: AtsType, slug: string): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(ATS_URLS[type](slug));
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (type === "greenhouse") return Array.isArray(data.jobs) ? data.jobs.length : null;
    if (type === "lever")      return Array.isArray(data) ? data.length : null;
    if (type === "ashby")      return Array.isArray(data.jobs) ? data.jobs.length : null;
    if (type === "gem")        return Array.isArray(data) ? data.length : null;
    return null;
  } catch {
    return null;
  }
}

// Derive slug candidates from company name
function slugCandidates(name: string): string[] {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hyphen = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return [...new Set([base, hyphen])];
}

async function findBetterAts(
  name: string,
  website: string | null,
  currentType: AtsType,
  currentSlug: string,
): Promise<{ type: AtsType; slug: string; count: number } | null> {
  const candidates = slugCandidates(name);
  const otherTypes = (["greenhouse", "lever", "ashby", "gem"] as AtsType[]).filter(t => t !== currentType);

  for (const type of otherTypes) {
    for (const slug of candidates) {
      const count = await probeAts(type, slug);
      if (count !== null && count > 0) {
        return { type, slug, count };
      }
    }
  }
  return null;
}

async function main() {
  const companies = await prisma.company.findMany({
    where: {
      sourceType: { not: "manual" },
      sourceId: { not: null },
      ...(TARGET ? { name: { contains: TARGET, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    take: LIMIT,
  });

  console.log(`Validating ${companies.length} companies with configured ATS…\n`);

  const broken: typeof companies = [];
  const fixed: { name: string; from: string; to: string; slug: string; count: number }[] = [];
  const zero: typeof companies = [];

  let checked = 0;
  for (const company of companies) {
    checked++;
    process.stdout.write(`\r[${checked}/${companies.length}] ${company.name.padEnd(40)}`);

    const type = company.sourceType as AtsType;
    const slug = company.sourceId!;
    const count = await probeAts(type, slug);

    if (count === null) {
      broken.push(company);
      if (FIX) {
        const better = await findBetterAts(company.name, company.website, type, slug);
        if (better) {
          await prisma.company.update({
            where: { id: company.id },
            data: { sourceType: better.type, sourceId: better.slug },
          });
          fixed.push({ name: company.name, from: `${type}/${slug}`, to: `${better.type}/${better.slug}`, slug: better.slug, count: better.count });
        }
      }
    } else if (count === 0) {
      zero.push(company);
    }
  }

  console.log("\n");

  if (broken.length === 0 && zero.length === 0) {
    console.log("✅ All configured ATS sources are returning jobs.");
    await prisma.$disconnect();
    return;
  }

  if (broken.length > 0) {
    console.log(`\n❌ BROKEN (404/error) — ${broken.length} companies:`);
    for (const c of broken) {
      const wasFixed = fixed.find(f => f.name === c.name);
      const suffix = wasFixed ? ` → FIXED: ${wasFixed.to} (${wasFixed.count} jobs)` : "";
      console.log(`  ${c.name.padEnd(35)} ${c.sourceType}/${c.sourceId}${suffix}`);
    }
  }

  if (zero.length > 0) {
    console.log(`\n⚠️  ZERO JOBS — ${zero.length} companies (may be hiring pause or wrong slug):`);
    for (const c of zero) {
      console.log(`  ${c.name.padEnd(35)} ${c.sourceType}/${c.sourceId}`);
    }
  }

  if (!FIX && broken.length > 0) {
    console.log(`\nRun with --fix to attempt auto-correction for broken sources.`);
  }

  console.log(`\nSummary: ${checked} checked, ${broken.length} broken, ${zero.length} zero-jobs, ${fixed.length} auto-fixed.`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
