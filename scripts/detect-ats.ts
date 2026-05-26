/**
 * Auto-detect ATS (Greenhouse / Lever / Ashby / Gem) for companies currently
 * set to source_type = 'manual' with no source_id.
 *
 * Strategy (in order):
 *   1. Probe each ATS API directly with slug candidates derived from the company name
 *   2. If that fails and the company has a website, fetch /careers & /jobs pages
 *      and look for ATS domain links / redirects
 *
 * Usage:
 *   npx tsx scripts/detect-ats.ts               # dry-run, top 100 tracked companies
 *   npx tsx scripts/detect-ats.ts --apply        # write matches to DB
 *   npx tsx scripts/detect-ats.ts --limit=500    # process more companies
 *   npx tsx scripts/detect-ats.ts --all          # all 1,767 companies with websites
 *   npx tsx scripts/detect-ats.ts --company=Stripe  # single company
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter } as any);

const APPLY    = process.argv.includes("--apply");
const ALL      = process.argv.includes("--all");
const LIMIT    = parseInt(process.argv.find(a => a.startsWith("--limit="))?.split("=")[1] ?? "100");
const COMPANY  = process.argv.find(a => a.startsWith("--company="))?.split("=")[1];
const OFFSET   = parseInt(process.argv.find(a => a.startsWith("--offset="))?.split("=")[1] ?? "0");
const TIMEOUT  = 7000;

// ── ATS patterns to look for in HTML / redirect URLs ─────────────────────────

const ATS_PATTERNS = [
  { type: "greenhouse" as const, regex: /boards(?:-api)?\.greenhouse\.io\/(?:v1\/boards\/)?([a-z0-9_-]+)/i },
  { type: "lever"      as const, regex: /(?:jobs\.lever\.co|api\.lever\.co\/v0\/postings)\/([a-z0-9_-]+)/i },
  { type: "ashby"      as const, regex: /(?:jobs\.ashbyhq\.com|app\.ashbyhq\.com\/jobs)\/([a-z0-9_-]+)/i },
  { type: "gem"        as const, regex: /jobs\.gem\.com\/([a-z0-9_-]+)/i },
];

// ── Slug candidates from a company name ──────────────────────────────────────

function slugCandidates(name: string): string[] {
  const base = name
    .toLowerCase()
    .replace(/[,\.!]+/g, "")
    .replace(/[&+]/g, "and")
    .replace(/\s+/g, " ")
    .trim();

  const hyphenated  = base.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const joined      = base.replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  const underscored = base.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  const firstWord   = base.split(/\s+/)[0].replace(/[^a-z0-9]/g, "");

  // Gem boards sometimes have a leading dash (e.g. "-joinforage")
  const domain = base.split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, "")).join("");

  return [...new Set([
    hyphenated, joined, underscored, firstWord,
    `-${hyphenated}`, `-${joined}`, `-${domain}`,
  ])].filter(Boolean);
}

// ── Fetch with timeout ────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, ms = TIMEOUT): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; crush-ats-detector/1.0; +https://crushco.app)",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

// ── Probe an ATS API directly ─────────────────────────────────────────────────

async function probeAts(type: string, slug: string): Promise<boolean> {
  const url: Record<string, string> = {
    greenhouse: `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
    lever:      `https://api.lever.co/v0/postings/${slug}?mode=json`,
    ashby:      `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
    gem:        `https://api.gem.com/job_board/v0/${encodeURIComponent(slug)}/job_posts/`,
  }[type];
  if (!url) return false;

  try {
    const res = await fetchWithTimeout(url, 5000);
    if (!res.ok) return false;
    const data = await res.json();
    if (type === "greenhouse") return Array.isArray((data as any).jobs);
    if (type === "lever")      return Array.isArray(data);
    if (type === "ashby")      return Array.isArray((data as any).jobs);
    if (type === "gem")        return Array.isArray(data);
    return false;
  } catch {
    return false;
  }
}

// ── Scrape careers / jobs pages for ATS links ─────────────────────────────────

async function detectFromPage(website: string): Promise<{ type: string; slug: string } | null> {
  const base = website.replace(/\/$/, "");
  const paths = ["/careers", "/jobs", "/about/careers", "/company/careers", "/work-with-us"];

  for (const path of paths) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`);
      if (!res.ok) continue;

      const finalUrl = res.url; // may have redirected
      const html = await res.text();
      const haystack = `${finalUrl}\n${html}`;

      for (const p of ATS_PATTERNS) {
        const match = haystack.match(p.regex);
        if (match?.[1]) return { type: p.type, slug: match[1] };
      }
    } catch {
      // timeout or connection error — try next path
    }
  }

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const where = {
    sourceType: "manual" as const,
    sourceId: null,
    website: { not: null } as { not: null },
    ...(COMPANY ? { name: { contains: COMPANY, mode: "insensitive" as const } } : {}),
  };

  // Prioritise tracked companies so we fix what users care about first
  const companies = await prisma.company.findMany({
    where,
    select: { id: true, name: true, website: true },
    orderBy: { trackedBy: { _count: "desc" } },
    take: ALL ? undefined : LIMIT,
    skip: OFFSET,
  });

  console.log(`\n🔍 Detecting ATS for ${companies.length} companies (apply=${APPLY})\n`);

  const results: Array<{ name: string; type: string; slug: string }> = [];
  let skipped = 0;

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    process.stdout.write(`[${i + 1}/${companies.length}] ${company.name} ... `);

    let found: { type: string; slug: string } | null = null;

    // Step 1: probe ATS APIs with slug candidates
    const slugs = slugCandidates(company.name);
    outer: for (const type of ["greenhouse", "lever", "ashby", "gem"]) {
      for (const slug of slugs) {
        if (await probeAts(type, slug)) {
          found = { type, slug };
          break outer;
        }
      }
    }

    // Step 2: scrape careers page HTML
    if (!found && company.website) {
      found = await detectFromPage(company.website);
    }

    if (found) {
      console.log(`✅  ${found.type} / ${found.slug}`);
      results.push({ name: company.name, ...found });

      if (APPLY) {
        await prisma.company.update({
          where: { id: company.id },
          data: { sourceType: found.type as any, sourceId: found.slug },
        });
      }
    } else {
      console.log("—  not detected");
      skipped++;
    }

    // Polite rate limit
    await new Promise(r => setTimeout(r, 120));
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  console.log(`\n${"─".repeat(60)}`);
  console.log(`✅  Detected: ${results.length}  |  —  Not found: ${skipped}`);
  if (APPLY) {
    console.log(`💾  Updated ${results.length} companies in DB`);
  } else {
    console.log(`\n💡  Re-run with --apply to write to DB`);
  }

  if (results.length > 0) {
    console.log(`\nDetected breakdown:`);
    const counts: Record<string, number> = {};
    for (const r of results) counts[r.type] = (counts[r.type] ?? 0) + 1;
    for (const [type, count] of Object.entries(counts)) {
      console.log(`  ${type}: ${count}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
