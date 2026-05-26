/**
 * Scrapes VC portfolio directories and upserts companies into the database
 * with sourceType='manual' and the appropriate VC tag.
 *
 * Sources & methods:
 *   YC              – Algolia API (5,926 companies, all batches)
 *   CB Insights     – HTML table (1,355 unicorns)
 *   a16z            – data-companies JSON in HTML (836)
 *   Sequoia         – WordPress REST /company (406)
 *   Kleiner Perkins – WordPress REST /company (404)
 *   Insight Partners– WordPress REST /sfcompany (847)
 *   NEA             – Custom JSON API /api/portfolio/companies (899)
 *   Index Ventures  – HTML company list class (375)
 *   Greylock        – WordPress REST /portfolio (157)
 *   Sapphire        – WordPress REST /company (185)
 *   Vista Equity    – WordPress REST /company (149)
 *   Bessemer        – HTML anchors class="name click-to-open" (513)
 *   Accel           – HTML aria-label="View COMPANY company details" (152)
 *   Spark Capital   – HTML img alt on /companies page (127)
 *   Founders Fund   – WordPress REST /company (62)
 *   Boldstart       – WordPress REST /company (78)
 *
 * Usage:
 *   npm run scrape-vc
 *   npm run scrape-vc -- --vc yc
 *   npm run scrape-vc -- --dry-run
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
const VC_FILTER = (() => {
  const i = args.indexOf("--vc");
  return i !== -1 ? args[i + 1] : null;
})();

// ── helpers ───────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA },
      ...init,
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

// ── database upsert ───────────────────────────────────────────────────────────

type CompanyRow = {
  name: string;
  slug: string;
  website?: string | null;
  description?: string | null;
};

async function upsertCompanyWithTag(
  company: CompanyRow,
  vcTag: string,
): Promise<"created" | "tagged" | "skipped"> {
  const { name, slug, website, description } = company;

  const existing = await prisma.company.findFirst({
    where: {
      OR: [
        { slug },
        { name: { equals: name, mode: "insensitive" } },
      ],
    },
    select: { id: true, tags: true },
  });

  if (existing) {
    if (existing.tags.includes(vcTag)) return "skipped";
    await prisma.company.update({
      where: { id: existing.id },
      data: { tags: [...existing.tags, vcTag] },
    });
    return "tagged";
  }

  try {
    await prisma.company.create({
      data: { name, slug, website, description, sourceType: "manual", tags: [vcTag] },
    });
    return "created";
  } catch {
    const collision = await prisma.company.findUnique({ where: { slug }, select: { id: true, tags: true } });
    if (collision && !collision.tags.includes(vcTag)) {
      await prisma.company.update({
        where: { id: collision.id },
        data: { tags: [...collision.tags, vcTag] },
      });
      return "tagged";
    }
    return "skipped";
  }
}

async function processNames(
  names: string[],
  vcTag: string,
): Promise<void> {
  let created = 0, tagged = 0, skipped = 0, errors = 0;
  const seen = new Set<string>();

  for (const raw of names) {
    const name = raw.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    try {
      const r = await upsertCompanyWithTag({ name, slug: toSlug(name) }, vcTag);
      if (r === "created") created++;
      else if (r === "tagged") tagged++;
      else skipped++;
    } catch {
      errors++;
    }
    await sleep(5);
  }

  console.log(`  Done: ${created} created, ${tagged} tagged existing, ${skipped} skipped, ${errors} errors`);
}

// ── WordPress REST API (shared pattern for 8 firms) ───────────────────────────

type WPPost = { title: { rendered: string } };

async function scrapeWordPress(
  label: string,
  baseUrl: string,
  postType: string,
  vcTag: string,
): Promise<void> {
  console.log(`\n── ${label} ─────────────────────────────────────────`);

  const PAGE_SIZE = 100;
  const probe = await fetch(
    `${baseUrl}/wp-json/wp/v2/${postType}?per_page=${PAGE_SIZE}&_fields=id`,
    { headers: { "User-Agent": BROWSER_UA } },
  );
  if (!probe.ok) { console.log(`  HTTP ${probe.status} on WP REST — skipping.`); return; }

  const total = parseInt(probe.headers.get("x-wp-total") ?? "0", 10);
  const totalPages = parseInt(probe.headers.get("x-wp-totalpages") ?? "1", 10);
  console.log(`  ${total} companies across ${totalPages} pages`);
  if (total === 0) { console.log("  Done: 0 created, 0 tagged existing, 0 skipped, 0 errors"); return; }

  const names: string[] = [];

  for (let page = 1; page <= totalPages; page++) {
    process.stdout.write(`\r  Page ${page}/${totalPages}  `);
    const data = await fetchJson<WPPost[]>(
      `${baseUrl}/wp-json/wp/v2/${postType}?per_page=${PAGE_SIZE}&page=${page}&_fields=title`,
    );
    if (!data) { console.log(`\n  API error on page ${page}, stopping.`); break; }
    for (const c of data) {
      const name = c.title.rendered.trim();
      if (name) names.push(name);
    }
    await sleep(150);
  }

  process.stdout.write("\n");
  if (DRY_RUN) { console.log(`  Done: ${names.length} created (dry run)`); return; }
  await processNames(names, vcTag);
}

// ── YC (Algolia API, all batches) ─────────────────────────────────────────────

const YC_APP_ID = "45BWZJ1SGC";
// Public search-only key embedded in ycombinator.com/companies page source
const YC_API_KEY = "NzllNTY5MzJiZGM2OTY2ZTQwMDEzOTNhYWZiZGRjODlhYzVkNjBmOGRjNzJiMWM4ZTU0ZDlhYTZjOTJiMjlhMWFuYWx5dGljc1RhZ3M9eWNkYyZyZXN0cmljdEluZGljZXM9WUNDb21wYW55X3Byb2R1Y3Rpb24lMkNZQ0NvbXBhbnlfQnlfTGF1bmNoX0RhdGVfcHJvZHVjdGlvbiZ0YWdGaWx0ZXJzPSU1QiUyMnljZGNfcHVibGljJTIyJTVE";
const YC_INDEX = "YCCompany_production";
const YC_URL = `https://45bwzj1sgc-dsn.algolia.net/1/indexes/${YC_INDEX}/query`;

async function algoliaQuery<T>(body: object): Promise<T | null> {
  return fetchJson<T>(YC_URL, {
    method: "POST",
    headers: {
      "X-Algolia-Application-Id": YC_APP_ID,
      "X-Algolia-API-Key": YC_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

type AlgoliaHit = { name: string; one_liner?: string; website?: string; batch?: string };
type AlgoliaResult = { hits: AlgoliaHit[]; nbHits: number };
type AlgoliaFacets = { facets?: { batch?: Record<string, number> } };

async function scrapeYC(): Promise<void> {
  console.log("\n── Y Combinator (Algolia) ───────────────────────────────────");

  // Get all batch names via facets
  const facetData = await algoliaQuery<AlgoliaFacets>({
    query: "",
    hitsPerPage: 0,
    facets: ["batch"],
    maxValuesPerFacet: 100,
  });

  const batchCounts = facetData?.facets?.batch ?? {};
  const batches = Object.keys(batchCounts).sort();
  const totalCompanies = Object.values(batchCounts).reduce((a, b) => a + b, 0);

  console.log(`  ${totalCompanies} companies across ${batches.length} batches`);
  if (batches.length === 0) { console.log("  No batches found — skipping."); return; }

  const names: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    process.stdout.write(`\r  Batch ${i + 1}/${batches.length}: ${batch.padEnd(15)}  `);

    const data = await algoliaQuery<AlgoliaResult>({
      query: "",
      hitsPerPage: 1000,
      page: 0,
      filters: `batch:"${batch}"`,
      attributesToRetrieve: ["name", "one_liner", "website"],
    });

    if (data?.hits) {
      for (const h of data.hits) {
        if (h.name) names.push(h.name);
      }
    }

    await sleep(100);
  }

  process.stdout.write("\n");
  console.log(`  Collected ${names.length} company names`);
  if (DRY_RUN) { console.log(`  Done: ${names.length} created (dry run)`); return; }
  await processNames(names, "YC");
}

// ── CB Insights Unicorn List ──────────────────────────────────────────────────

async function scrapeCBInsights(): Promise<void> {
  console.log("\n── CB Insights Unicorn List ─────────────────────────────────");
  console.log("  Fetching unicorn companies page…");

  const html = await fetchHtml("https://www.cbinsights.com/research-unicorn-companies");
  if (!html) { console.log("  Fetch failed — skipping."); return; }

  const names: string[] = [];
  const re = /<td><a href="https:\/\/www\.cbinsights\.com\/company\/[^"]+">([^<]+)<\/a><\/td>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const name = m[1].trim();
    if (name) names.push(name);
  }

  console.log(`  ${names.length} unicorn companies found`);
  if (DRY_RUN) { console.log(`  Done: ${names.length} created (dry run)`); return; }
  await processNames(names, "Unicorn");
}

// ── a16z ──────────────────────────────────────────────────────────────────────

type A16zCompany = {
  name: string;
  post_title: string;
  display_name: string;
  external_url: string;
  company_url: string;
  website_description: string;
};

async function scrapeA16z(): Promise<void> {
  console.log("\n── Andreessen Horowitz (a16z) ───────────────────────────────");
  console.log("  Fetching portfolio page…");

  const html = await fetchHtml("https://a16z.com/portfolio");
  if (!html) { console.log("  Fetch failed — skipping."); return; }

  const match = html.match(/data-companies="([^"]+)"/);
  if (!match) { console.log("  data-companies attribute not found — skipping."); return; }

  const raw = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#039;/g, "'");
  const companies: A16zCompany[] = JSON.parse(raw);
  console.log(`  ${companies.length} companies in dataset`);
  if (DRY_RUN) { console.log(`  Done: ${companies.length} created (dry run)`); return; }

  let created = 0, tagged = 0, skipped = 0, errors = 0;
  const seen = new Set<string>();

  for (const c of companies) {
    const name = (c.display_name || c.name || c.post_title)?.trim();
    if (!name || seen.has(name.toLowerCase())) { skipped++; continue; }
    seen.add(name.toLowerCase());

    const website = c.external_url || c.company_url || null;
    try {
      const r = await upsertCompanyWithTag(
        { name, slug: toSlug(name), website, description: c.website_description || null },
        "a16z",
      );
      if (r === "created") created++;
      else if (r === "tagged") tagged++;
      else skipped++;
    } catch {
      errors++;
    }
    await sleep(5);
  }

  console.log(`  Done: ${created} created, ${tagged} tagged existing, ${skipped} skipped, ${errors} errors`);
}

// ── NEA ───────────────────────────────────────────────────────────────────────

async function scrapeNEA(): Promise<void> {
  console.log("\n── NEA ──────────────────────────────────────────────────────");
  console.log("  Fetching portfolio JSON…");

  type NEAResponse = { companies: Array<{ title?: string; name?: string }> };
  const data = await fetchJson<NEAResponse>("https://www.nea.com/api/portfolio/companies");
  if (!data?.companies) { console.log("  API failed — skipping."); return; }

  const names = data.companies
    .map(c => (c.title || c.name || "").trim())
    .filter(Boolean);

  console.log(`  ${names.length} companies in dataset`);
  if (DRY_RUN) { console.log(`  Done: ${names.length} created (dry run)`); return; }
  await processNames(names, "NEA");
}

// ── Index Ventures ────────────────────────────────────────────────────────────

async function scrapeIndexVentures(): Promise<void> {
  console.log("\n── Index Ventures ───────────────────────────────────────────");
  console.log("  Fetching portfolio page…");

  const html = await fetchHtml("https://www.indexventures.com/companies");
  if (!html) { console.log("  Fetch failed — skipping."); return; }

  // Company names are in anchor text inside company list items
  const names: string[] = [];
  const re = /class="companies__relationships__list__item__link">\s*([^\s<][^<]*?)\s*(?:<span|<\/a)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const name = m[1].trim();
    if (name) names.push(name);
  }

  console.log(`  ${names.length} companies found`);
  if (DRY_RUN) { console.log(`  Done: ${names.length} created (dry run)`); return; }
  await processNames(names, "Index Ventures");
}

// ── Bessemer ──────────────────────────────────────────────────────────────────

async function scrapeBessemer(): Promise<void> {
  console.log("\n── Bessemer Venture Partners ────────────────────────────────");
  console.log("  Fetching portfolio page…");

  const html = await fetchHtml("https://www.bvp.com/portfolio");
  if (!html) { console.log("  Fetch failed — skipping."); return; }

  const names: string[] = [];
  const re = /class="name click-to-open">([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const name = m[1].trim();
    if (name) names.push(name);
  }

  console.log(`  ${names.length} companies found`);
  if (DRY_RUN) { console.log(`  Done: ${names.length} created (dry run)`); return; }
  await processNames(names, "Bessemer");
}

// ── Accel ─────────────────────────────────────────────────────────────────────

async function scrapeAccel(): Promise<void> {
  console.log("\n── Accel ────────────────────────────────────────────────────");
  console.log("  Fetching portfolio page…");

  const html = await fetchHtml("https://www.accel.com/companies");
  if (!html) { console.log("  Fetch failed — skipping."); return; }

  const names: string[] = [];
  const re = /aria-label="View ([^"]+) company details"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const name = m[1].trim();
    if (name) names.push(name);
  }

  console.log(`  ${names.length} companies found`);
  if (DRY_RUN) { console.log(`  Done: ${names.length} created (dry run)`); return; }
  await processNames(names, "Accel");
}

// ── Spark Capital ─────────────────────────────────────────────────────────────

async function scrapeSparkCapital(): Promise<void> {
  console.log("\n── Spark Capital ────────────────────────────────────────────");
  console.log("  Fetching portfolio page…");

  const html = await fetchHtml("https://www.sparkcapital.com/companies");
  if (!html) { console.log("  Fetch failed — skipping."); return; }

  // Company logos have alt="COMPANY NAME"
  const names: string[] = [];
  const re = /<img[^>]+alt="([^"]{2,60})"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const name = m[1].trim();
    // Filter out non-company alt text (icons, logos for nav, etc.)
    if (name && !name.toLowerCase().includes("logo") && !name.toLowerCase().includes("icon")) {
      names.push(name);
    }
  }

  console.log(`  ${names.length} company entries found`);
  if (DRY_RUN) { console.log(`  Done: ${names.length} created (dry run)`); return; }
  await processNames(names, "Spark Capital");
}

// ── main ──────────────────────────────────────────────────────────────────────

const SOURCES = [
  // ── Primary sources ────────────────────────────────────────────────────────
  { key: "yc",              run: scrapeYC },
  { key: "cbinsights",      run: scrapeCBInsights },
  { key: "a16z",            run: scrapeA16z },
  // ── WordPress REST API sources ─────────────────────────────────────────────
  { key: "sequoia",         run: () => scrapeWordPress("Sequoia Capital",    "https://www.sequoiacap.com",          "company",   "Sequoia") },
  { key: "kleiner",         run: () => scrapeWordPress("Kleiner Perkins",    "https://www.kleinerperkins.com",      "company",   "Kleiner Perkins") },
  { key: "insight",         run: () => scrapeWordPress("Insight Partners",   "https://www.insightpartners.com",     "sfcompany", "Insight Partners") },
  { key: "greylock",        run: () => scrapeWordPress("Greylock",           "https://greylock.com",                "portfolio", "Greylock") },
  { key: "sapphire",        run: () => scrapeWordPress("Sapphire Ventures",  "https://sapphireventures.com",        "company",   "Sapphire") },
  { key: "vista",           run: () => scrapeWordPress("Vista Equity",       "https://www.vistaequitypartners.com", "company",   "Vista Equity") },
  { key: "boldstart",       run: () => scrapeWordPress("Boldstart",          "https://boldstart.vc",                "company",   "Boldstart") },
  { key: "foundersfund",    run: () => scrapeWordPress("Founders Fund",       "https://foundersfund.com",            "company",   "Founders Fund") },
  // ── HTML parsing sources ───────────────────────────────────────────────────
  { key: "nea",             run: scrapeNEA },
  { key: "indexventures",   run: scrapeIndexVentures },
  { key: "bessemer",        run: scrapeBessemer },
  { key: "accel",           run: scrapeAccel },
  { key: "spark",           run: scrapeSparkCapital },
];

const VALID_KEYS = SOURCES.map((s) => s.key).join(", ");

async function main() {
  if (DRY_RUN) console.log("DRY RUN — no DB writes\n");

  const sources = VC_FILTER
    ? SOURCES.filter((s) => s.key === VC_FILTER)
    : SOURCES;

  if (sources.length === 0) {
    console.error(`Unknown --vc value: "${VC_FILTER}". Valid options: ${VALID_KEYS}`);
    process.exit(1);
  }

  console.log(`Scraping ${sources.length} VC portfolio source(s)\n`);

  for (const source of sources) {
    await source.run();
  }

  const total = await prisma.company.count();
  console.log(`\nTotal companies in DB: ${total.toLocaleString()}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
