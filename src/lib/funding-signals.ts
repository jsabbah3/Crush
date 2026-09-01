/**
 * funding-signals.ts
 *
 * Core logic for ingesting funding announcements from RSS feeds.
 * Called by /api/cron/funding weekly.
 */

import Parser from "rss-parser";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.APP_URL ?? "https://crushco.app";

// Lazily constructed — same reason as getResend() in notifications.ts: a
// module-level `new Anthropic()` would make `next build` require
// ANTHROPIC_API_KEY at build time (it collects page data for /api/cron/*
// which import this file). Runtime is the only place the key is needed.
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

// ─── Tier-1 investors ─────────────────────────────────────────────────────────

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
  "neo",
]);

// ─── RSS sources ──────────────────────────────────────────────────────────────

const RSS_FEEDS = [
  "https://techcrunch.com/category/venture/feed/",
  "https://venturebeat.com/category/business/feed/",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const hyphen    = base.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const joined    = base.replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  const firstWord = base.split(/\s+/)[0].replace(/[^a-z0-9]/g, "");
  return [...new Set([hyphen, joined, firstWord])].filter(Boolean);
}

// ─── ATS validation ───────────────────────────────────────────────────────────

async function probeGreenhouse(slug: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    const json = await res.json() as { jobs?: unknown[] };
    return Array.isArray(json.jobs) ? `https://boards.greenhouse.io/${slug}` : null;
  } catch { return null; }
}

async function probeLever(slug: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${slug}?mode=json&limit=1`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json) ? `https://jobs.lever.co/${slug}` : null;
  } catch { return null; }
}

async function probeAshby(slug: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    const json = await res.json() as { jobPostings?: unknown[] };
    return json && "jobPostings" in json ? `https://jobs.ashbyhq.com/${slug}` : null;
  } catch { return null; }
}

async function detectAts(
  companyName: string,
): Promise<{ type: string; slug: string; url: string } | null> {
  for (const slug of slugCandidates(companyName)) {
    const [gh, lv, ash] = await Promise.all([
      probeGreenhouse(slug),
      probeLever(slug),
      probeAshby(slug),
    ]);
    if (gh)  return { type: "greenhouse", slug, url: gh };
    if (lv)  return { type: "lever",      slug, url: lv };
    if (ash) return { type: "ashby",      slug, url: ash };
  }
  return null;
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

type RoundStage = "pre_seed" | "seed" | "series_a" | "series_b" | "series_c_plus" | "growth" | "unknown";

interface ParsedFunding {
  companyName: string;
  amount: string;
  amountM: number;
  round: string;
  roundStage: RoundStage;
}

function parseRound(round: string): RoundStage {
  const r = round.toLowerCase();
  if (r.includes("pre-seed") || r.includes("pre seed")) return "pre_seed";
  if (r.includes("seed")) return "seed";
  if (r.includes("series a")) return "series_a";
  if (r.includes("series b")) return "series_b";
  if (r.includes("series c") || r.includes("series d") || r.includes("series e")) return "series_c_plus";
  if (r.includes("growth") || r.includes("late")) return "growth";
  return "unknown";
}

function toPrismaFundingStage(stage: RoundStage): string | null {
  const map: Record<string, string> = {
    pre_seed: "pre_seed", seed: "seed",
    series_a: "series_a", series_b: "series_b",
    series_c_plus: "series_c", growth: "growth",
  };
  return map[stage] ?? null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Regex extraction used to produce junk here: "Travis Kalanick's robotics
 * company", "CTO", "Reach Capital" (a VC closing a new FUND, not a startup
 * raising one) all matched the same "$X raised/raises" shape a hand-rolled
 * pattern can't tell apart. An LLM reads the actual sentence instead of
 * pattern-matching its shape, so it can reject the VC-fund-close case
 * entirely and pull the real proper noun out of a noisy headline.
 */
async function extractFundingSignal(
  title: string,
  content: string,
): Promise<ParsedFunding & { investors: string[] } | null> {
  const snippet = stripHtml(content).slice(0, 1200);

  let response;
  try {
    response = await getAnthropic().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You extract startup funding announcements from news headlines. Given a headline and article snippet, determine whether this is a STARTUP raising a NEW round of venture funding — not a VC firm closing a new fund of its own, not an acquisition, not an IPO, not a valuation report with no new funding, not layoffs.

Headline: ${title}
Snippet: ${snippet}

Return ONLY valid JSON, no markdown, no explanation:
{
  "isStartupFundingRound": boolean,
  "companyName": string or null — the exact company name that raised money, no descriptive filler (e.g. "Acme", not "AI infrastructure startup Acme" or "Travis Kalanick's robotics company"),
  "amountM": number or null — funding amount in millions USD,
  "round": string or null — e.g. "Seed", "Series A", "Series B", "Growth",
  "investors": array of investor/VC firm names mentioned, or []
}

If this is not a startup funding round, or you cannot confidently extract both a company name and an amount, set isStartupFundingRound to false.`,
        },
      ],
    });
  } catch {
    return null;
  }

  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  // Haiku wraps JSON in a ```json fence often enough to matter even when
  // told not to — strip it before parsing instead of failing closed.
  const jsonText = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  let parsed: {
    isStartupFundingRound: boolean;
    companyName: string | null;
    amountM: number | null;
    round: string | null;
    investors: string[];
  };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return null;
  }

  if (!parsed.isStartupFundingRound || !parsed.companyName || !parsed.amountM) return null;
  if (parsed.amountM < 5) return null;

  const round = parsed.round?.trim() ||
    (parsed.amountM >= 100 ? "Growth" : parsed.amountM >= 30 ? "Series B" : "Series A");

  return {
    companyName: parsed.companyName.trim(),
    amountM: parsed.amountM,
    amount: parsed.amountM >= 1000 ? `$${(parsed.amountM / 1000).toFixed(1)}B` : `$${parsed.amountM}M`,
    round,
    roundStage: parseRound(round),
    investors: Array.isArray(parsed.investors) ? parsed.investors.slice(0, 5) : [],
  };
}

function hasTier1Investor(investors: string[], fullContent: string): boolean {
  const text = (investors.join(" ") + " " + fullContent.slice(0, 3000)).toLowerCase();
  for (const inv of TIER_1_INVESTORS) {
    if (text.includes(inv)) return true;
  }
  return false;
}

function shouldAutoApprove(stage: RoundStage, tier1: boolean, atsFound: boolean): boolean {
  if (!atsFound) return false;
  if (stage === "series_b" || stage === "series_c_plus" || stage === "growth") return true;
  if (stage === "series_a" && tier1) return true;
  return false;
}

function shouldQueue(stage: RoundStage, tier1: boolean): boolean {
  if (stage === "pre_seed" || stage === "seed") return false;
  if (stage === "series_a" && !tier1) return false;
  return true;
}

// ─── Company creation ─────────────────────────────────────────────────────────

async function createOrUpdateCompany(
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
      fundingStage: fundingStage as any,
      recentlyFundedAt: new Date(),
      sourceType: ats.type as any,
      sourceId: ats.slug,
    },
  });

  await prisma.fundingSignal.update({
    where: { id: signalId },
    data: { status: "added", companyId: company.id },
  });

  return company;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface FundingIngestResult {
  processed: number;
  autoApproved: number;
  queued: number;
  reviewUrl: string;
}

export async function runFundingSignalIngest(): Promise<FundingIngestResult> {
  const parser = new Parser({ timeout: 10000 });
  let processed = 0;
  let autoApproved = 0;
  let queued = 0;

  for (const feedUrl of RSS_FEEDS) {
    let feed: Awaited<ReturnType<typeof parser.parseURL>>;
    try {
      feed = await parser.parseURL(feedUrl);
    } catch {
      continue;
    }

    for (const item of feed.items ?? []) {
      const title   = item.title ?? "";
      const link    = item.link ?? "";
      const content = item.content ?? item.contentSnippet ?? item.summary ?? "";

      if (!link) continue;

      const existing = await prisma.fundingSignal.findUnique({ where: { sourceUrl: link } });
      if (existing) continue;

      const parsed = await extractFundingSignal(title, content);
      if (!parsed) continue;

      const investors = parsed.investors.join("; ") || null;
      const tier1      = hasTier1Investor(parsed.investors, content);

      if (!shouldQueue(parsed.roundStage, tier1)) continue;

      const ats = await detectAts(parsed.companyName);

      const autoApprove = shouldAutoApprove(parsed.roundStage, tier1, !!ats);

      // Check if company already in DB
      const existingCompany = await prisma.company.findUnique({
        where: { slug: toSlug(parsed.companyName) },
      });

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
            investors: investors,
            sourceUrl: link,
            atsUrl: ats?.url ?? null,
            atsPlatform: ats?.type ?? null,
            atsSlug: ats?.slug ?? null,
            status: "added",
            autoApproved: true,
            companyId: existingCompany.id,
          },
        });
        autoApproved++;
        processed++;
        continue;
      }

      const signal = await prisma.fundingSignal.create({
        data: {
          companyName: parsed.companyName,
          amount: parsed.amount,
          round: parsed.round,
          investors: investors,
          sourceUrl: link,
          atsUrl: ats?.url ?? null,
          atsPlatform: ats?.type ?? null,
          atsSlug: ats?.slug ?? null,
          status: autoApprove ? "approved" : "pending",
          autoApproved: autoApprove,
        },
      });

      if (autoApprove && ats) {
        await createOrUpdateCompany(parsed, ats, signal.id);
        autoApproved++;
      } else {
        queued++;
      }

      processed++;
    }
  }

  return {
    processed,
    autoApproved,
    queued,
    reviewUrl: `${APP_URL}/api/cron/funding`,
  };
}
