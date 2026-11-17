import { prisma } from "@/lib/prisma";
import { fetchRecentYc, ycBatchTag } from "@/lib/discovery/yc";
import { extractRounds, fetchFundingHeadlines } from "@/lib/discovery/funding-news";
import { admit, fundingLine, host, type Candidate } from "@/lib/discovery/admit";

export type DiscoveryResult = {
  headlines: number;
  rounds: number;
  ycCandidates: number;
  considered: number;
  newCompanies: number;
  updated: number;
  newlyListed: number;
  skipped: Record<string, number>;
  outOfTime: boolean;
};

/**
 * Daily: find companies worth watching from reputable sources and put the
 * ones with a readable job board on Crush.
 *   1. Funding news (last 3 days) — startups that just raised.
 *   2. YC's recent batches — companies we don't have yet, or have but
 *      couldn't find a board for (re-checked every two weeks).
 * Stops cleanly when the time budget runs out; tomorrow picks up the rest.
 */
export async function runDiscovery({
  budgetMs = 240_000,
  ycLimit = 120,
}: { budgetMs?: number; ycLimit?: number } = {}): Promise<DiscoveryResult> {
  const deadline = Date.now() + budgetMs;
  const r: DiscoveryResult = {
    headlines: 0, rounds: 0, ycCandidates: 0, considered: 0,
    newCompanies: 0, updated: 0, newlyListed: 0, skipped: {}, outOfTime: false,
  };

  const candidates: Candidate[] = [];

  // 1. Funding news
  try {
    const headlines = await fetchFundingHeadlines();
    r.headlines = headlines.length;
    const known = new Set(
      (await prisma.fundingSignal.findMany({
        where: { sourceUrl: { in: headlines.map((h) => h.link) } },
        select: { sourceUrl: true },
      })).map((s) => s.sourceUrl),
    );
    const rounds = await extractRounds(headlines.filter((h) => !known.has(h.link)));
    r.rounds = rounds.length;
    for (const f of rounds) {
      candidates.push({
        name: f.company,
        website: null,
        via: `Funding news: ${fundingLine(f)}`,
        usBased: !!f.country && /^(?:us|usa|united states|u\.s\.)$/i.test(f.country),
        funding: {
          round: f.round,
          amountM: f.amountM,
          investors: f.investors,
          sourceUrl: f.headline.link,
          publishedAt: f.headline.publishedAt ?? new Date(),
        },
      });
    }
  } catch (err) {
    console.error("funding news failed", err);
  }

  // 2. YC — new to us, or on file without a board and not checked lately.
  try {
    const yc = await fetchRecentYc();
    const companies = await prisma.company.findMany({
      where: { OR: [{ tags: { has: "YC" } }, { website: { not: null } }] },
      select: { name: true, website: true, sourceType: true, atsCheckedAt: true },
    });
    const byHost = new Map(companies.map((c) => [host(c.website), c]));
    const recheckBefore = Date.now() - 14 * 86_400_000;
    const todo = yc
      .filter((y) => {
        const c = byHost.get(host(y.website));
        return !c || (c.sourceType === "manual" && (!c.atsCheckedAt || c.atsCheckedAt.getTime() < recheckBefore));
      })
      // Hiring companies and the newest batches first.
      .sort((a, b) => Number(b.isHiring) - Number(a.isHiring) || b.batch.localeCompare(a.batch))
      .slice(0, ycLimit);
    r.ycCandidates = todo.length;
    for (const y of todo) {
      candidates.push({
        name: y.name,
        website: y.website,
        via: `YC ${y.batch}`,
        tags: ["YC", ycBatchTag(y.batch)],
        description: y.oneLiner,
        industry: y.industry,
        usBased: y.regions.some((r) => /united states|america|remote/i.test(r)),
      });
    }
  } catch (err) {
    console.error("YC directory failed", err);
  }

  // 3. Admit, a few at a time, until the budget runs out.
  const queue = [...candidates];
  async function worker() {
    for (let c = queue.shift(); c; c = queue.shift()) {
      if (Date.now() > deadline) {
        r.outOfTime = true;
        return;
      }
      r.considered++;
      try {
        const res = await admit(c);
        if (res.outcome === "new") r.newCompanies++;
        if (res.outcome === "updated") r.updated++;
        if (res.outcome === "skipped") r.skipped[res.reason ?? "other"] = (r.skipped[res.reason ?? "other"] ?? 0) + 1;
        if (res.listed) r.newlyListed++;
      } catch (err) {
        console.error("admit failed", c.name, err);
        r.skipped.error = (r.skipped.error ?? 0) + 1;
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  return r;
}
