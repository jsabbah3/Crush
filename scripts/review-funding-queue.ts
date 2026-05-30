/**
 * review-funding-queue.ts
 *
 * Interactive CLI to review pending funding signals.
 * For each company: press Y to approve (creates company), N to reject, S to skip.
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/review-funding-queue.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter } as any);

// ─── Shared helpers (duplicated from fetch-funding-signals for standalone use) ─

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

const ATS_PROBES: { type: string; urlFn: (slug: string) => string }[] = [
  { type: "greenhouse", urlFn: (s) => `https://boards.greenhouse.io/${s}` },
  { type: "lever",      urlFn: (s) => `https://jobs.lever.co/${s}` },
  { type: "ashby",      urlFn: (s) => `https://jobs.ashbyhq.com/${s}` },
  { type: "gem",        urlFn: (s) => `https://jobs.gem.com/${s}` },
];

async function detectAts(
  companyName: string,
): Promise<{ type: string; slug: string; url: string } | null> {
  for (const { type, urlFn } of ATS_PROBES) {
    for (const slug of slugCandidates(companyName)) {
      const url = urlFn(slug);
      try {
        const res = await fetch(url, {
          method: "HEAD",
          signal: AbortSignal.timeout(4000),
          redirect: "follow",
        });
        if (res.ok) return { type, slug, url };
      } catch { /* try next */ }
    }
  }
  return null;
}

function parseRoundToStage(round: string | null): string | null {
  if (!round) return null;
  const r = round.toLowerCase();
  if (r.includes("pre-seed") || r.includes("pre seed")) return "pre_seed";
  if (r.includes("seed")) return "seed";
  if (r.includes("series a")) return "series_a";
  if (r.includes("series b")) return "series_b";
  if (r.includes("series c") || r.includes("series d") || r.includes("series e")) return "series_c";
  if (r.includes("growth")) return "growth";
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const pending = await prisma.fundingSignal.findMany({
    where: { status: "pending" },
    orderBy: { detectedAt: "asc" },
  });

  if (pending.length === 0) {
    console.log("\n✓ No pending funding signals to review.\n");
    await prisma.$disconnect();
    return;
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`  ${pending.length} companies in the review queue`);
  console.log(`${"─".repeat(50)}`);
  console.log(`  Commands: (Y)es add · (N)o reject · (S)kip · (Q)uit\n`);

  const rl = readline.createInterface({ input, output });
  let approved = 0;
  let rejected = 0;

  for (let i = 0; i < pending.length; i++) {
    const signal = pending[i];

    console.log(`\n[${i + 1}/${pending.length}] ${signal.companyName}`);
    console.log(`  Round     : ${signal.round ?? "unknown"} · ${signal.amount ?? "?"}`);
    if (signal.investors) console.log(`  Investors : ${signal.investors}`);
    console.log(`  ATS       : ${signal.atsUrl ? `✓ ${signal.atsUrl}` : "✗ not found"}`);
    console.log(`  Source    : ${signal.sourceUrl}`);

    let ats = signal.atsUrl
      ? { type: signal.atsPlatform!, slug: signal.atsSlug!, url: signal.atsUrl }
      : null;

    const answer = await rl.question("\n  (Y/N/S/Q): ");
    const cmd = answer.trim().toLowerCase();

    if (cmd === "q") {
      console.log("\n  Quitting review.");
      break;
    }

    if (cmd === "s") {
      console.log("  Skipped.");
      continue;
    }

    if (cmd === "n") {
      await prisma.fundingSignal.update({
        where: { id: signal.id },
        data: { status: "rejected" },
      });
      console.log("  ✗ Rejected.");
      rejected++;
      continue;
    }

    if (cmd === "y") {
      // If no ATS found yet, try again or ask for URL
      if (!ats) {
        console.log("  Re-checking ATS...");
        ats = await detectAts(signal.companyName);
        if (ats) {
          console.log(`  ✓ Found: ${ats.url}`);
        } else {
          const manualUrl = await rl.question(
            "  ATS URL (paste Greenhouse/Lever/Ashby board URL, or press Enter to add without): "
          );
          if (manualUrl.trim()) {
            const url = manualUrl.trim();
            // Detect platform from URL
            const type =
              url.includes("greenhouse") ? "greenhouse" :
              url.includes("lever") ? "lever" :
              url.includes("ashby") ? "ashby" :
              url.includes("gem") ? "gem" : "manual";
            const slugMatch = url.match(/\/([a-z0-9_-]+)\/?$/i);
            const slug = slugMatch?.[1] ?? "";
            ats = { type, slug, url };
          }
        }
      }

      // Check if already in DB
      const dbSlug = toSlug(signal.companyName);
      const existing = await prisma.company.findUnique({ where: { slug: dbSlug } });

      if (existing) {
        // Just update funding metadata
        await prisma.company.update({
          where: { id: existing.id },
          data: {
            recentlyFundedAt: new Date(),
            fundingStage: parseRoundToStage(signal.round) as any,
            ...(ats && { sourceType: ats.type as any, sourceId: ats.slug }),
          },
        });
        await prisma.fundingSignal.update({
          where: { id: signal.id },
          data: { status: "added", companyId: existing.id, autoApproved: false },
        });
        console.log(`  ✓ Updated existing company "${existing.name}"`);
      } else {
        // Create new company
        const company = await prisma.company.create({
          data: {
            name: signal.companyName,
            slug: dbSlug,
            sourceType: (ats?.type ?? "manual") as any,
            sourceId: ats?.slug ?? null,
            fundingStage: parseRoundToStage(signal.round) as any,
            recentlyFundedAt: new Date(),
          },
        });
        await prisma.fundingSignal.update({
          where: { id: signal.id },
          data: {
            status: "added",
            companyId: company.id,
            autoApproved: false,
            ...(ats && { atsUrl: ats.url, atsPlatform: ats.type, atsSlug: ats.slug }),
          },
        });
        console.log(`  ✓ Created company "${company.name}" (id: ${company.id})`);
        if (!ats) {
          console.log(`    Note: no ATS set — run detect-ats.ts --company="${company.name}" later`);
        }
      }

      approved++;
    }
  }

  rl.close();

  console.log(`\n${"─".repeat(50)}`);
  console.log(`  Approved : ${approved}`);
  console.log(`  Rejected : ${rejected}`);
  console.log(`${"─".repeat(50)}\n`);

  if (approved > 0) {
    console.log(`  Companies added. Run ATS ingestion to pick up their jobs.\n`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
