/**
 * fetch-funding-signals.ts
 *
 * Parses TechCrunch RSS for funding announcements, checks ATS compatibility,
 * and queues companies for review — or auto-approves them if they hit a
 * tier-1 investor and ATS criteria.
 *
 * Auto-approval rules:
 *   Series B+     → auto-approve if ATS found (quality established by stage)
 *   Series A      → auto-approve only if tier-1 investor + ATS found
 *   Seed/Pre-seed → always pending (too early)
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/fetch-funding-signals.ts
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/fetch-funding-signals.ts --dry-run
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import Parser from "rss-parser";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter } as any);

const DRY_RUN = process.argv.includes("--dry-run");

// ─── Tier-1 investors (auto-green-light for Series A) ─────────────────────────

const TIER_1_INVESTORS = new Set([
  "andreessen horowitz", "a16z",
  "sequoia capital", "sequoia",
  "benchmark",
  "accel",
  "greylock",
  "kleiner perkins", "kpcb",
  "index ventures",
  "founders fund",
  "general catalyst",
  "lightspeed venture partners", "lightspeed",
  "bessemer venture partners", "bessemer",
  "tiger global",
  "coatue management", "coatue",
  "dst global", "dst",
  "thrive capital",
  "google ventures", "gv",
  "spark capital",
  "union square ventures", "usv",
  "first round capital", "first round",
  "nea",
  "battery ventures",
  "ivp",
  "y combinator", "ycombinator", "yc",
  "khosla ventures", "khosla",
  "insight partners",
  "softbank vision fund", "softbank",
  "ribbit capital",
  "matrix partners",
  "redpoint ventures", "redpoint",
  "norwest venture partners", "norwest",
  "felicis ventures", "felicis",
  "emergence capital",
  "initialized capital",
  "lux capital",
  "craft ventures",
  "greenoaks capital",
  "dragoneer investment", "dragoneer",
  "conviction capital", "conviction",
  "primary venture partners", "primary",
  "boldstart ventures", "boldstart",
  "coatue",
  "neo",
]);

// ─── RSS sources ──────────────────────────────────────────────────────────────

const RSS_FEEDS = [
  "https://techcrunch.com/category/venture/feed/",  // TC venture/startup funding coverage
  "https://venturebeat.com/category/business/feed/", // VentureBeat funding
];

// ─── Slug generation ──────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,\.!&+]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugCandidates(name: string): string[] {
  const base = name.toLowerCase().replace(/[,\.!]+/g, "").replace(/[&+]/g, "and").trim();
  const hyphen   = base.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const joined   = base.replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  const firstWord = base.split(/\s+/)[0].replace(/[^a-z0-9]/g, "");
  return [...new Set([hyphen, joined, firstWord])].filter(Boolean);
}

// ─── ATS detection ────────────────────────────────────────────────────────────

// ─── ATS validation (API-based, not just HTTP status) ────────────────────────
// Ashby and Lever return 200 for unknown slugs, so we verify via their APIs.

async function probeGreenhouse(slug: string): Promise<string | null> {
  // Greenhouse boards API returns JSON with jobs array
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const json = await res.json() as { jobs?: unknown[] };
    if (Array.isArray(json.jobs)) return `https://boards.greenhouse.io/${slug}`;
  } catch { /* ignore */ }
  return null;
}

async function probeLever(slug: string): Promise<string | null> {
  // Lever public postings API — 200 + array means the board exists
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json&limit=1`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const json = await res.json();
    if (Array.isArray(json)) return `https://jobs.lever.co/${slug}`;
  } catch { /* ignore */ }
  return null;
}

async function probeAshby(slug: string): Promise<string | null> {
  // Ashby public job board API
  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const json = await res.json() as { jobPostings?: unknown[] };
    // Valid Ashby boards return an object with jobPostings array
    if (json && typeof json === "object" && "jobPostings" in json) {
      return `https://jobs.ashbyhq.com/${slug}`;
    }
  } catch { /* ignore */ }
  return null;
}

async function probeGem(slug: string): Promise<string | null> {
  const url = `https://jobs.gem.com/${slug}`;
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(4000) });
    if (res.ok) return url;
  } catch { /* ignore */ }
  return null;
}

async function detectAts(
  companyName: string,
): Promise<{ type: string; slug: string; url: string } | null> {
  const candidates = slugCandidates(companyName);

  for (const slug of candidates) {
    const [ghUrl, lvrUrl, ashUrl, gemUrl] = await Promise.all([
      probeGreenhouse(slug),
      probeLever(slug),
      probeAshby(slug),
      probeGem(slug),
    ]);

    if (ghUrl)  return { type: "greenhouse", slug, url: ghUrl };
    if (lvrUrl) return { type: "lever",      slug, url: lvrUrl };
    if (ashUrl) return { type: "ashby",      slug, url: ashUrl };
    if (gemUrl) return { type: "gem",        slug, url: gemUrl };
  }
  return null;
}

// ─── Round parsing ────────────────────────────────────────────────────────────

interface ParsedFunding {
  companyName: string;
  amount: string;
  amountM: number;
  round: string; // "Series A", "Series B", "Seed", etc.
  roundStage: "pre_seed" | "seed" | "series_a" | "series_b" | "series_c_plus" | "growth" | "unknown";
}

function parseRound(round: string): ParsedFunding["roundStage"] {
  const r = round.toLowerCase();
  if (r.includes("pre-seed") || r.includes("pre seed")) return "pre_seed";
  if (r.includes("seed")) return "seed";
  if (r.includes("series a")) return "series_a";
  if (r.includes("series b")) return "series_b";
  if (r.includes("series c") || r.includes("series d") || r.includes("series e")) return "series_c_plus";
  if (r.includes("growth") || r.includes("late")) return "growth";
  return "unknown";
}

// Maps our internal stage to the Prisma FundingStage enum values
function toPrismaFundingStage(stage: ParsedFunding["roundStage"]): string | null {
  const map: Record<string, string> = {
    pre_seed:    "pre_seed",
    seed:        "seed",
    series_a:    "series_a",
    series_b:    "series_b",
    series_c_plus: "series_c",
    growth:      "growth",
  };
  return map[stage] ?? null;
}

// Matches "[Company] raises/secures/etc $XM ..."
const PRIMARY_RE =
  /^(.+?)\s+(?:raises?|secures?|closes?|nabs?|lands?|gets?|announces?|snags?)\s+\$(\d+(?:\.\d+)?)\s*([MBK])\b/i;

// Matches "... just raised/reportedly raising $XM ..." (creative headlines)
const SECONDARY_RE =
  /^(.+?)\s+(?:reportedly\s+|just\s+)?(?:raised?|raising|plans?\s+to\s+raise)\s+\$(\d+(?:\.\d+)?)\s*([MBK])\b/i;

// Extracts round label from anywhere in the title/content
const ROUND_RE =
  /\b(Series\s+[A-Z]{1,2}|Pre-[Ss]eed|[Ss]eed(?:\s+round)?|[Gg]rowth(?:\s+round)?|[Ll]ate[- ][Ss]tage)\b/i;

/**
 * TC headlines often wrap the company name in context:
 *   "After Nvidia's $20B not-acqui-hire, AI chip startup Groq reportedly raising..."
 *   "Amazon fulfillment competitor Stord raises..."
 *
 * Strategy: if the extracted name looks noisy (>35 chars or contains lowercase filler),
 * try to pull the last capitalized word/phrase from it.
 */
function cleanupCompanyName(raw: string): string | null {
  const trimmed = raw.trim();

  // Strip known lead-in patterns: "AI startup Acme" → "Acme"
  let cleaned = trimmed
    .replace(/^(?:AI|ML|crypto|fintech|edtech|healthtech|proptech|chip|data|cloud|deep[- ]tech|clean[- ]tech|climate[- ]tech)\s+(?:startup|company|firm)\s+/i, "")
    .replace(/^(?:after|before|as|with|for)\s+.+?,\s*/i, "") // strip "After Nvidia's $20B..., " preambles
    .trim();

  // If there are lowercase "filler" words between capitalized proper nouns
  // (e.g. "Amazon fulfillment Stord", "AI chip startup Groq"), take the last
  // contiguous run of capitalized words.
  const words = cleaned.split(/\s+/);
  if (words.length > 1) {
    // Find the last word that starts with uppercase
    let lastCapIdx = -1;
    for (let i = words.length - 1; i >= 0; i--) {
      if (/^[A-Z]/.test(words[i])) { lastCapIdx = i; break; }
    }
    if (lastCapIdx > 0) {
      // Build a run of contiguous capitalized words ending at lastCapIdx
      let start = lastCapIdx;
      while (start > 0 && /^[A-Z]/.test(words[start - 1])) start--;
      // Only take the tail if there are lowercase words before it (noise signal)
      const hasFiller = words.slice(0, start).some(w => /^[a-z]/.test(w));
      if (hasFiller || start > 0) {
        cleaned = words.slice(start).join(" ");
      }
    }
  }

  // Hard cap — anything still over 35 chars or > 4 words is probably still noise
  if (cleaned.length > 35 || cleaned.split(/\s+/).length > 4) return null;

  // Reject obvious non-company-name starts
  if (/^(the|a|an|this|that|it|he|she|they)\s/i.test(cleaned)) return null;

  return cleaned || null;
}

function parseFundingTitle(title: string): ParsedFunding | null {
  const m = title.match(PRIMARY_RE) ?? title.match(SECONDARY_RE);
  if (!m) return null;

  const rawName = m[1].trim();
  const companyName = cleanupCompanyName(rawName);
  if (!companyName) return null;

  // Reject names that are clearly not company names
  if (/^(the|a|an|this|that|it|he|she|they)\s/i.test(companyName)) return null;

  const num = parseFloat(m[2]);
  const suffix = m[3].toUpperCase();

  const amountM =
    suffix === "B" ? num * 1000 :
    suffix === "K" ? num / 1000 :
    num;

  // Skip rounds below $5M — too small, too early
  if (amountM < 5) return null;

  const roundMatch = title.match(ROUND_RE);
  const round = roundMatch
    ? roundMatch[1].trim().replace(/\s+(round)$/i, "").trim()
    : amountM >= 100 ? "Growth" : amountM >= 30 ? "Series B" : "Series A";

  return {
    companyName,
    amount: `$${m[2]}${suffix}`,
    amountM,
    round,
    roundStage: parseRound(round),
  };
}

// ─── Investor extraction ──────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractInvestors(content: string): string {
  const text = stripHtml(content).slice(0, 2000); // first ~2000 chars is enough
  // Look for "led by X", "from X and Y", "backed by X"
  const patterns = [
    /led by ([A-Z][^.]+?)(?:\.|,|$)/gi,
    /backed by ([A-Z][^.]+?)(?:\.|,|$)/gi,
    /from ([A-Z][^.]+?)(?:\.|,|$)/gi,
  ];
  const found: string[] = [];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(text)) !== null) {
      found.push(match[1].trim());
    }
  }
  return [...new Set(found)].slice(0, 3).join("; ");
}

function hasTier1Investor(investors: string, fullContent: string): boolean {
  const text = (investors + " " + fullContent.slice(0, 3000)).toLowerCase();
  for (const inv of TIER_1_INVESTORS) {
    if (text.includes(inv)) return true;
  }
  return false;
}

// ─── Auto-approval logic ──────────────────────────────────────────────────────

function shouldAutoApprove(
  stage: ParsedFunding["roundStage"],
  tier1: boolean,
  atsFound: boolean,
): boolean {
  if (!atsFound) return false;
  if (stage === "series_b" || stage === "series_c_plus" || stage === "growth") return true;
  if (stage === "series_a" && tier1) return true;
  return false;
}

function shouldQueue(
  stage: ParsedFunding["roundStage"],
  tier1: boolean,
): boolean {
  // Don't bother queueing pre-seed or seed
  if (stage === "pre_seed" || stage === "seed") return false;
  // Series A without tier 1 is noise
  if (stage === "series_a" && !tier1) return false;
  return true;
}

// ─── Company creation ─────────────────────────────────────────────────────────

async function createCompanyFromSignal(
  parsed: ParsedFunding,
  ats: { type: string; slug: string; url: string },
  signalId: string,
) {
  const slug = toSlug(parsed.companyName);
  const fundingStage = toPrismaFundingStage(parsed.roundStage);

  const company = await prisma.company.upsert({
    where: { slug },
    create: {
      name: parsed.companyName,
      slug,
      sourceType: ats.type as any,
      sourceId: ats.slug,
      fundingStage: fundingStage as any,
      recentlyFundedAt: new Date(),
    },
    update: {
      // Only update funding data — don't overwrite existing description etc.
      fundingStage: fundingStage as any,
      recentlyFundedAt: new Date(),
      // Update ATS if not already set
      sourceType: ats.type as any,
      sourceId: ats.slug,
    },
  });

  // Mark signal as added
  await prisma.fundingSignal.update({
    where: { id: signalId },
    data: { status: "added", companyId: company.id },
  });

  return company;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const parser = new Parser({ timeout: 10000 });

  let newSignals = 0;
  let autoApproved = 0;
  let queued = 0;
  let skipped = 0;

  for (const feedUrl of RSS_FEEDS) {
    console.log(`\nParsing feed: ${feedUrl}`);
    let feed: Awaited<ReturnType<typeof parser.parseURL>>;
    try {
      feed = await parser.parseURL(feedUrl);
    } catch (err) {
      console.error(`  ✗ Failed to fetch feed: ${err}`);
      continue;
    }

    for (const item of feed.items ?? []) {
      const title = item.title ?? "";
      const link = item.link ?? "";
      const content = (item.content ?? item.contentSnippet ?? item.summary ?? "");

      if (!link) continue;

      // Already processed?
      const existing = await prisma.fundingSignal.findUnique({ where: { sourceUrl: link } });
      if (existing) continue;

      // Parse title
      const parsed = parseFundingTitle(title);
      if (!parsed) continue;

      const investors = extractInvestors(content);
      const tier1 = hasTier1Investor(investors, content);

      // Decide if this is worth processing at all
      if (!shouldQueue(parsed.roundStage, tier1)) {
        continue;
      }

      // Check if company already exists in DB (by slug)
      const existingCompany = await prisma.company.findUnique({
        where: { slug: toSlug(parsed.companyName) },
      });

      console.log(`\n  → ${parsed.companyName} · ${parsed.amount} ${parsed.round}`);
      if (investors) console.log(`    Investors: ${investors}`);
      if (tier1) console.log(`    ✓ Tier-1 investor match`);
      if (existingCompany) console.log(`    Already in DB (id: ${existingCompany.id})`);

      // ATS check
      console.log(`    Checking ATS...`);
      const ats = await detectAts(parsed.companyName);
      if (ats) {
        console.log(`    ✓ ATS: ${ats.type} · ${ats.url}`);
      } else {
        console.log(`    ✗ No ATS found`);
      }

      const autoApprove = shouldAutoApprove(parsed.roundStage, tier1, !!ats);

      if (DRY_RUN) {
        console.log(`    [dry-run] Would ${autoApprove ? "AUTO-APPROVE" : "QUEUE"}`);
        newSignals++;
        if (autoApprove) autoApproved++;
        else queued++;
        continue;
      }

      // If company already exists, just update funding metadata
      if (existingCompany) {
        const fundingStage = toPrismaFundingStage(parsed.roundStage);
        await prisma.company.update({
          where: { id: existingCompany.id },
          data: {
            recentlyFundedAt: new Date(),
            ...(fundingStage && { fundingStage: fundingStage as any }),
            ...(ats && !existingCompany.sourceId && {
              sourceType: ats.type as any,
              sourceId: ats.slug,
            }),
          },
        });
        await prisma.fundingSignal.create({
          data: {
            companyName: parsed.companyName,
            amount: parsed.amount,
            round: parsed.round,
            investors: investors || null,
            sourceUrl: link,
            atsUrl: ats?.url ?? null,
            atsPlatform: ats?.type ?? null,
            atsSlug: ats?.slug ?? null,
            status: "added",
            autoApproved: true,
            companyId: existingCompany.id,
          },
        });
        console.log(`    ✓ Updated existing company with new funding date`);
        autoApproved++;
        newSignals++;
        continue;
      }

      // Create signal record
      const signal = await prisma.fundingSignal.create({
        data: {
          companyName: parsed.companyName,
          amount: parsed.amount,
          round: parsed.round,
          investors: investors || null,
          sourceUrl: link,
          atsUrl: ats?.url ?? null,
          atsPlatform: ats?.type ?? null,
          atsSlug: ats?.slug ?? null,
          status: autoApprove ? "approved" : "pending",
          autoApproved: autoApprove,
        },
      });

      if (autoApprove && ats) {
        const company = await createCompanyFromSignal(parsed, ats, signal.id);
        console.log(`    ✓ AUTO-APPROVED — created company (id: ${company.id})`);
        autoApproved++;
      } else {
        console.log(`    → Queued for review`);
        queued++;
      }

      newSignals++;
    }
  }

  console.log(`
─────────────────────────────
  New signals processed : ${newSignals}
  Auto-approved         : ${autoApproved}
  Queued for review     : ${queued}
  Skipped               : ${skipped}
─────────────────────────────`);

  if (queued > 0) {
    console.log(`  Run review queue: npx dotenv-cli -e .env.local -- npx tsx scripts/review-funding-queue.ts`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
