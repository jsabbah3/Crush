/**
 * Scrapes company slugs from Greenhouse, Lever, and Ashby via the
 * Wayback Machine CDX API (which indexes every URL ever crawled),
 * then fetches company metadata from each platform's public API
 * and upserts new companies into the database.
 *
 * Usage:  npm run scrape-ats
 *         npm run scrape-ats -- --platform greenhouse
 *         npm run scrape-ats -- --dry-run
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

// ── CLI flags ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const PLATFORM_FILTER = (() => {
  const i = args.indexOf("--platform");
  return i !== -1 ? args[i + 1] : null;
})();

// ── constants ─────────────────────────────────────────────────────────────────

const CDX_PAGE_SIZE = 50_000;
const CDX_MAX_PAGES = 20;          // cap at 1M URLs per platform
const FETCH_DELAY_MS = 120;        // polite delay between API calls
const CONCURRENCY = 5;
const UA = "crush-scraper/1.0 (job board aggregator; https://crush.so)";

// Path components that aren't company slugs
const SKIP_PATHS = new Set([
  "embed", "api", "jobs", "apply", "thanks", "confirm", "error",
  ".well-known", "robots.txt", "sitemap.xml", "favicon.ico",
  "healthcheck", "public", "static", "assets", "cdn", "img", "images",
]);

// Looks like a real company slug: alphanumeric+hyphens, min length 2
const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{1,99}$/;

// ── utils ─────────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function slugToName(slug: string): string {
  return slug
    .replace(/[-_.]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function fetchText(url: string, timeoutMs = 30_000): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    // Keep timer active during body read so slow/stalled connections time out.
    const text = await res.text();
    clearTimeout(timer);
    return text;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function fetchJson<T>(url: string, timeoutMs = 15_000): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// Bounded concurrency pool
async function pool(tasks: (() => Promise<void>)[], limit: number) {
  const q = [...tasks];
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, async () => {
      while (q.length > 0) await q.shift()!();
    }),
  );
}

// ── CDX discovery ─────────────────────────────────────────────────────────────
//
// The Wayback Machine CDX API indexes every URL the Internet Archive has ever
// crawled. We query it to discover company slugs without needing sitemaps.

function extractSlug(url: string, domain: string): string | null {
  try {
    const after = url.split(domain + "/")[1];
    if (!after) return null;
    const slug = after.split(/[/?#]/)[0].toLowerCase();
    if (!slug || SKIP_PATHS.has(slug) || !SLUG_RE.test(slug)) return null;
    return slug;
  } catch {
    return null;
  }
}

async function cdxSlugs(domain: string): Promise<string[]> {
  const slugs = new Set<string>();

  for (let page = 0; page < CDX_MAX_PAGES; page++) {
    const offset = page * CDX_PAGE_SIZE;
    process.stdout.write(`\r  CDX page ${page + 1} (offset ${offset.toLocaleString()})…`);

    const url =
      `https://web.archive.org/cdx/search/cdx` +
      `?url=${encodeURIComponent(domain + "/*")}` +
      `&output=text&fl=original&collapse=urlkey` +
      `&limit=${CDX_PAGE_SIZE}&offset=${offset}`;

    let text: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      text = await fetchText(url, 90_000);
      if (text !== null) break;
      process.stdout.write(`(retry ${attempt + 1})…`);
      await sleep(3_000);
    }
    if (text === null) {
      process.stdout.write(`(skipped)\n`);
      break; // give up on this platform after 3 consecutive failures
    }

    const lines = text.trim().split("\n").filter(Boolean);
    for (const line of lines) {
      const slug = extractSlug(line.trim(), domain);
      if (slug && !slugs.has(slug)) slugs.add(slug);
    }

    if (lines.length < CDX_PAGE_SIZE) break; // last page
    await sleep(500); // polite delay between CDX pages
  }

  process.stdout.write(`\n`);
  return [...slugs];
}

// ── platform: Greenhouse ──────────────────────────────────────────────────────

async function getGreenhouseSlugs() {
  return cdxSlugs("boards.greenhouse.io");
}

async function getGreenhouseName(slug: string): Promise<string | null> {
  // boards-api returns { name, content } for valid boards
  const data = await fetchJson<{ name?: string }>(
    `https://boards-api.greenhouse.io/v1/boards/${slug}`,
  );
  return data?.name ?? null;
}

// ── platform: Lever ───────────────────────────────────────────────────────────

async function getLeverSlugs() {
  return cdxSlugs("jobs.lever.co");
}

async function getLeverName(slug: string): Promise<string | null> {
  const data = await fetchJson<Array<{ company?: string }>>(
    `https://api.lever.co/v0/postings/${slug}?mode=json&limit=1`,
  );
  // null means the fetch failed or 404 — skip the company
  if (data === null) return null;
  // [] means the board exists but has no open roles right now — keep the company
  if (!Array.isArray(data)) return null;
  return data[0]?.company ?? slugToName(slug);
}

// ── platform: Ashby ───────────────────────────────────────────────────────────

async function getAshbySlugs() {
  return cdxSlugs("jobs.ashbyhq.com");
}

async function getAshbyName(slug: string): Promise<string | null> {
  const data = await fetchJson<{ jobBoard?: { name?: string } }>(
    `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
  );
  return data?.jobBoard?.name ?? null;
}

// ── database ──────────────────────────────────────────────────────────────────

async function loadExistingSourceIds(sourceType: string): Promise<Set<string>> {
  const rows = await prisma.company.findMany({
    where: { sourceType: sourceType as never, sourceId: { not: null } },
    select: { sourceId: true },
  });
  return new Set(rows.map((r) => r.sourceId!));
}

function toDbSlug(atsSlug: string): string {
  return atsSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

async function upsertCompany({
  atsSlug,
  name,
  sourceType,
}: {
  atsSlug: string;
  name: string;
  sourceType: "greenhouse" | "lever" | "ashby";
}) {
  const dbSlug = toDbSlug(atsSlug);
  await prisma.company.upsert({
    where: { slug: dbSlug },
    create: { name, slug: dbSlug, sourceType, sourceId: atsSlug },
    // Don't overwrite curated fields (name, description, website, etc.) on existing rows
    update: { sourceType, sourceId: atsSlug },
  });
}

// ── platform runner ───────────────────────────────────────────────────────────

async function runPlatform({
  label,
  sourceType,
  getSlugs,
  getName,
}: {
  label: string;
  sourceType: "greenhouse" | "lever" | "ashby";
  getSlugs: () => Promise<string[]>;
  getName: (slug: string) => Promise<string | null>;
}) {
  // Load all slugs already in DB so we can skip them
  const existing = await loadExistingSourceIds(sourceType);

  process.stdout.write(`  discovering slugs via CDX…\n`);
  const allSlugs = await getSlugs();
  const newSlugs = allSlugs.filter((s) => !existing.has(s));

  console.log(
    `  ${allSlugs.length.toLocaleString()} discovered | ` +
      `${existing.size.toLocaleString()} already in DB | ` +
      `${newSlugs.length.toLocaleString()} new`,
  );

  if (DRY_RUN) {
    console.log("  [dry-run] skipping DB writes");
    return { added: 0, skipped: existing.size, failed: 0, total: allSlugs.length };
  }

  let added = 0;
  let failed = 0;
  let notFound = 0;

  const tasks = newSlugs.map((slug) => async () => {
    await sleep(FETCH_DELAY_MS);

    // Try to get the real company name from the platform API
    const apiName = await getName(slug);
    if (apiName === null) {
      // API returned 404 — company no longer uses this ATS or slug is stale
      notFound++;
      return;
    }

    try {
      await upsertCompany({ atsSlug: slug, name: apiName, sourceType });
      added++;
    } catch {
      // Slug collision with an existing company under a different source
      failed++;
    }

    const done = added + failed + notFound;
    if (done % 100 === 0 || done === newSlugs.length) {
      process.stdout.write(
        `\r  ${done.toLocaleString()} / ${newSlugs.length.toLocaleString()} ` +
          `(+${added} added, ${notFound} stale, ${failed} conflict)`,
      );
    }
  });

  await pool(tasks, CONCURRENCY);
  process.stdout.write("\n");

  return { added, skipped: existing.size, failed, notFound, total: allSlugs.length };
}

// ── main ──────────────────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    label: "Greenhouse",
    sourceType: "greenhouse" as const,
    getSlugs: getGreenhouseSlugs,
    getName: getGreenhouseName,
  },
  {
    label: "Lever",
    sourceType: "lever" as const,
    getSlugs: getLeverSlugs,
    getName: getLeverName,
  },
  {
    label: "Ashby",
    sourceType: "ashby" as const,
    getSlugs: getAshbySlugs,
    getName: getAshbyName,
  },
];

async function main() {
  if (DRY_RUN) console.log("DRY RUN — no DB writes\n");

  const platforms = PLATFORM_FILTER
    ? PLATFORMS.filter((p) => p.sourceType === PLATFORM_FILTER)
    : PLATFORMS;

  if (platforms.length === 0) {
    console.error(`Unknown platform: ${PLATFORM_FILTER}. Use greenhouse, lever, or ashby.`);
    process.exit(1);
  }

  console.log("Scraping ATS company directories via Wayback CDX\n");

  let totalAdded = 0;
  const summary: Record<string, ReturnType<typeof runPlatform> extends Promise<infer T> ? T : never> = {};

  for (const platform of platforms) {
    console.log(`── ${platform.label} ${"─".repeat(55 - platform.label.length)}`);
    try {
      const result = await runPlatform(platform);
      summary[platform.label] = result;
      totalAdded += result.added;
    } catch (e) {
      console.error(`  failed:`, e);
    }
    console.log();
  }

  console.log("─".repeat(60));
  for (const [label, r] of Object.entries(summary)) {
    const notFound = "notFound" in r ? r.notFound : 0;
    console.log(
      `  ${label.padEnd(12)} +${String(r.added).padStart(5)} added` +
        `  ${String(r.skipped).padStart(5)} skipped` +
        `  ${String(notFound).padStart(5)} stale`,
    );
  }
  console.log(`\n  Total new companies added: ${totalAdded.toLocaleString()}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
