/**
 * Scrapes VC portfolio directories and upserts companies into the database
 * with sourceType='manual' and the appropriate VC tag.
 *
 * Sources:
 *   YC          – https://api.ycombinator.com/v0.1/companies  (REST, paginated)
 *   a16z        – https://a16z.com/portfolio                  (data-companies JSON in HTML)
 *   Sequoia     – https://www.sequoiacap.com/wp-json/wp/v2/company (WordPress REST)
 *   CB Insights – https://www.cbinsights.com/research-unicorn-companies (HTML table)
 *   Accel       – https://www.accel.com/companies             (aria-label HTML)
 *   Bessemer    – https://www.bvp.com/portfolio               (HTML anchors)
 *
 * Usage:
 *   npm run scrape-vc
 *   npm run scrape-vc -- --vc yc
 *   npm run scrape-vc -- --vc cbinsights
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
      headers: { "User-Agent": "crush-scraper/1.0 (https://crush.so)" },
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

  // Create — slug might still collide if two companies normalise the same way
  try {
    await prisma.company.create({
      data: { name, slug, website, description, sourceType: "manual", tags: [vcTag] },
    });
    return "created";
  } catch {
    // Slug collision — find the actual duplicate and tag it
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
  websiteFor?: (name: string) => string | null,
): Promise<void> {
  let created = 0, tagged = 0, skipped = 0, errors = 0;

  for (const name of names) {
    try {
      const r = await upsertCompanyWithTag(
        {
          name,
          slug: toSlug(name),
          website: websiteFor ? websiteFor(name) : null,
        },
        vcTag,
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

// ── YC ────────────────────────────────────────────────────────────────────────

type YCCompany = {
  name: string;
  slug: string;
  website: string;
  oneLiner: string;
  status: string;
  batch: string;
};

async function scrapeYC(): Promise<void> {
  console.log("\n── Y Combinator ─────────────────────────────────────────────");

  let page = 1;
  let totalPages = 1;
  let created = 0, tagged = 0, skipped = 0, errors = 0;

  while (page <= totalPages) {
    process.stdout.write(`\r  Page ${page}/${totalPages}  (+${created} created, +${tagged} tagged, ${skipped} skipped)  `);

    const data = await fetchJson<{ companies: YCCompany[]; totalPages: number }>(
      `https://api.ycombinator.com/v0.1/companies?page=${page}&per_page=25&status=Active`,
    );

    if (!data) {
      console.log(`\n  API error on page ${page}, stopping.`);
      break;
    }

    totalPages = data.totalPages;

    if (!DRY_RUN) {
      for (const c of data.companies) {
        try {
          const r = await upsertCompanyWithTag(
            { name: c.name, slug: toSlug(c.name), website: c.website || null, description: c.oneLiner || null },
            "YC",
          );
          if (r === "created") created++;
          else if (r === "tagged") tagged++;
          else skipped++;
        } catch {
          errors++;
        }
        await sleep(5);
      }
    } else {
      created += data.companies.length;
    }

    page++;
    await sleep(150);
  }

  process.stdout.write("\n");
  console.log(`  Done: ${created} created, ${tagged} tagged existing, ${skipped} skipped, ${errors} errors`);
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
  if (!match) {
    console.log("  Could not find data-companies in HTML — skipping.");
    return;
  }

  const raw = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#039;/g, "'");
  const companies: A16zCompany[] = JSON.parse(raw);
  console.log(`  ${companies.length} companies in dataset`);

  if (DRY_RUN) { console.log(`  Done: ${companies.length} created (dry run)`); return; }

  let created = 0, tagged = 0, skipped = 0, errors = 0;
  for (const c of companies) {
    const name = c.display_name || c.name || c.post_title;
    if (!name) { skipped++; continue; }

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

// ── Sequoia ───────────────────────────────────────────────────────────────────

type WPCompany = {
  id: number;
  title: { rendered: string };
  link: string;
};

async function scrapeSequoia(): Promise<void> {
  console.log("\n── Sequoia Capital ──────────────────────────────────────────");

  const PAGE_SIZE = 100;
  const headRes = await fetch(
    `https://www.sequoiacap.com/wp-json/wp/v2/company?per_page=${PAGE_SIZE}&_fields=id`,
    { headers: { "User-Agent": "crush-scraper/1.0" } },
  );
  const total = parseInt(headRes.headers.get("x-wp-total") ?? "0", 10);
  const totalPages = parseInt(headRes.headers.get("x-wp-totalpages") ?? "1", 10);
  console.log(`  ${total} companies across ${totalPages} pages`);

  let created = 0, tagged = 0, skipped = 0, errors = 0;

  for (let page = 1; page <= totalPages; page++) {
    process.stdout.write(`\r  Page ${page}/${totalPages}  `);

    const data = await fetchJson<WPCompany[]>(
      `https://www.sequoiacap.com/wp-json/wp/v2/company?per_page=${PAGE_SIZE}&page=${page}&_fields=id,title,link`,
    );

    if (!data) { console.log(`\n  API error on page ${page}, stopping.`); break; }

    if (!DRY_RUN) {
      for (const c of data) {
        const name = c.title.rendered.trim();
        if (!name) { skipped++; continue; }

        try {
          const r = await upsertCompanyWithTag(
            { name, slug: toSlug(name), website: null },
            "Sequoia",
          );
          if (r === "created") created++;
          else if (r === "tagged") tagged++;
          else skipped++;
        } catch {
          errors++;
        }
        await sleep(5);
      }
    } else {
      created += data.length;
    }

    await sleep(200);
  }

  process.stdout.write("\n");
  console.log(`  Done: ${created} created, ${tagged} tagged existing, ${skipped} skipped, ${errors} errors`);
}

// ── CB Insights Unicorn List ──────────────────────────────────────────────────

async function scrapeCBInsights(): Promise<void> {
  console.log("\n── CB Insights Unicorn List ─────────────────────────────────");
  console.log("  Fetching unicorn companies page…");

  const html = await fetchHtml("https://www.cbinsights.com/research-unicorn-companies");
  if (!html) { console.log("  Fetch failed — skipping."); return; }

  // Extract company names from table: <td><a href="...cbinsights.com/company/...">NAME</a></td>
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

// ── Accel ─────────────────────────────────────────────────────────────────────

async function scrapeAccel(): Promise<void> {
  console.log("\n── Accel ────────────────────────────────────────────────────");
  console.log("  Fetching portfolio page…");

  const html = await fetchHtml("https://www.accel.com/companies");
  if (!html) { console.log("  Fetch failed — skipping."); return; }

  // aria-label="View COMPANY company details"
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

// ── Bessemer ──────────────────────────────────────────────────────────────────

async function scrapeBessemer(): Promise<void> {
  console.log("\n── Bessemer Venture Partners ────────────────────────────────");
  console.log("  Fetching portfolio page…");

  const html = await fetchHtml("https://www.bvp.com/portfolio");
  if (!html) { console.log("  Fetch failed — skipping."); return; }

  // <a ... class="name click-to-open">COMPANY NAME</a>
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

// ── main ──────────────────────────────────────────────────────────────────────

const SOURCES = [
  { key: "yc",          label: "YC",          run: scrapeYC },
  { key: "a16z",        label: "a16z",        run: scrapeA16z },
  { key: "sequoia",     label: "Sequoia",     run: scrapeSequoia },
  { key: "cbinsights",  label: "CB Insights", run: scrapeCBInsights },
  { key: "accel",       label: "Accel",       run: scrapeAccel },
  { key: "bessemer",    label: "Bessemer",    run: scrapeBessemer },
];

async function main() {
  if (DRY_RUN) console.log("DRY RUN — no DB writes\n");

  const sources = VC_FILTER
    ? SOURCES.filter((s) => s.key === VC_FILTER)
    : SOURCES;

  if (sources.length === 0) {
    console.error(`Unknown VC: ${VC_FILTER}. Valid options: ${SOURCES.map((s) => s.key).join(", ")}`);
    process.exit(1);
  }

  console.log("Scraping VC portfolio directories\n");

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
