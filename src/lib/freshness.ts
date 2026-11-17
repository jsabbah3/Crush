import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { relevantCompanyWhere } from "@/lib/company-relevance";

export { NEW_DAYS, RAISED_DAYS, isNewOnCrush, isJustRaised } from "@/lib/freshness-dates";
import { NEW_DAYS, RAISED_DAYS } from "@/lib/freshness-dates";

const DAY = 86_400_000;

export type Raise = { round: string | null; amount: string | null; at: Date; sourceUrl: string };

/** The latest funding announcement we hold for each company. */
export async function latestRaises(companyIds: string[]): Promise<Map<string, Raise>> {
  if (companyIds.length === 0) return new Map();
  const signals = await prisma.fundingSignal.findMany({
    where: { companyId: { in: companyIds }, status: { in: ["added", "approved"] } },
    orderBy: { detectedAt: "desc" },
    select: { companyId: true, round: true, amount: true, detectedAt: true, sourceUrl: true },
  });
  const out = new Map<string, Raise>();
  for (const s of signals) {
    if (s.companyId && !out.has(s.companyId)) {
      out.set(s.companyId, { round: s.round, amount: s.amount, at: s.detectedAt, sourceUrl: s.sourceUrl });
    }
  }
  return out;
}

/** "$85M Series A" from a stored round + amount. */
export function raiseLabel(r: Pick<Raise, "round" | "amount"> | undefined): string | null {
  if (!r) return null;
  const round = r.round && r.round !== "Funding round" ? r.round : null;
  return [r.amount, round].filter(Boolean).join(" ") || "New funding";
}

const listed = { ...relevantCompanyWhere, jobs: { some: { status: "ACTIVE" as const } } };
const openCount = { _count: { select: { jobs: { where: { status: "ACTIVE" as const } } } } };

/**
 * What's fresh on Crush, for the landing page: companies that just raised,
 * companies that just got listed, and how many arrived this month. Cached
 * for an hour — discovery runs once a day.
 */
export const getFreshness = unstable_cache(
  async () => {
    const now = Date.now();
    const [raisedRows, newRows, newThisMonth, raisedThisMonth] = await Promise.all([
      prisma.company.findMany({
        where: { AND: [listed, { recentlyFundedAt: { gte: new Date(now - RAISED_DAYS * DAY) } }] },
        orderBy: { recentlyFundedAt: "desc" },
        take: 6,
        select: { id: true, name: true, slug: true, website: true, recentlyFundedAt: true, ...openCount },
      }),
      prisma.company.findMany({
        where: { AND: [listed, { listedAt: { gte: new Date(now - NEW_DAYS * DAY) } }] },
        orderBy: { listedAt: "desc" },
        take: 6,
        select: { id: true, name: true, slug: true, website: true, listedAt: true, discoveredVia: true, ...openCount },
      }),
      prisma.company.count({ where: { AND: [listed, { listedAt: { gte: new Date(now - NEW_DAYS * DAY) } }] } }),
      prisma.company.count({ where: { AND: [listed, { recentlyFundedAt: { gte: new Date(now - NEW_DAYS * DAY) } }] } }),
    ]);
    const raises = await latestRaises(raisedRows.map((r) => r.id));
    return {
      raised: raisedRows.map((r) => ({
        name: r.name, slug: r.slug, website: r.website, openRoles: r._count.jobs,
        at: r.recentlyFundedAt!, label: raiseLabel(raises.get(r.id)),
      })),
      fresh: newRows.map((r) => ({
        name: r.name, slug: r.slug, website: r.website, openRoles: r._count.jobs,
        at: r.listedAt!, via: shortVia(r.discoveredVia),
      })),
      newThisMonth,
      raisedThisMonth,
    };
  },
  ["freshness-v1"],
  { revalidate: 3600 },
);

/** "YC Winter 2026" → "YC W26"; "Funding news: $85M Series A" → "Just raised". */
export function shortVia(via: string | null): string | null {
  if (!via) return null;
  const yc = via.match(/^YC (Winter|Spring|Summer|Fall) (\d{4})$/);
  if (yc) return `YC ${yc[1][0]}${yc[2].slice(2)}`;
  if (via.startsWith("Funding news")) return "Just raised";
  return via;
}
