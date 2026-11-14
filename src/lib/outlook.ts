import { prisma } from "@/lib/prisma";
import { doesJobMatch, expandRoleTitles } from "@/lib/matching";

export type Outlook = {
  /** Roles posted in the window that would have matched this user. */
  matched: number;
  /** When the most recent of those went up. */
  lastAt: Date | null;
};

export const OUTLOOK_DAYS = 90;

type Prefs = {
  seniority?: string[];
  remoteOnly?: boolean | null;
  locationFilter?: string | null;
} | null;

/**
 * "How often does this company actually post a role like mine?" — answered
 * from history, for each company on a user's list.
 *
 * A watchlist asks someone to wait, and waiting with no information is where
 * people give up: an empty list looks the same whether the company posts your
 * role monthly or never has. This counts, per company, the postings from the
 * last 90 days (open or since closed) that the matcher would have sent this
 * user, so the list can say "4 like yours in 90 days" or, honestly, "none".
 *
 * The title pre-filter runs in SQL so only plausible rows come back; the real
 * matcher then applies seniority/location exactly as alerts do.
 */
export async function getOutlook(
  companyIds: string[],
  roleTitles: string[],
  prefs: Prefs,
): Promise<Map<string, Outlook>> {
  const out = new Map<string, Outlook>();
  if (companyIds.length === 0 || roleTitles.length === 0) return out;

  const since = new Date(Date.now() - OUTLOOK_DAYS * 86400000);
  const variants = expandRoleTitles(roleTitles).filter((v) => v.trim().length > 1);

  const jobs = await prisma.job.findMany({
    where: {
      companyId: { in: companyIds },
      AND: [
        // Some boards don't publish a posted date; fall back to when we first saw the role.
        { OR: [{ postedAt: { gte: since } }, { postedAt: null, createdAt: { gte: since } }] },
        { OR: variants.map((v) => ({ title: { contains: v, mode: "insensitive" as const } })) },
      ],
    },
    orderBy: { postedAt: "desc" },
    take: 2000,
  });

  for (const job of jobs) {
    if (!doesJobMatch(job, roleTitles, prefs?.seniority ?? [], prefs?.remoteOnly ?? null, prefs?.locationFilter ?? null)) {
      continue;
    }
    const cur = out.get(job.companyId) ?? { matched: 0, lastAt: null };
    cur.matched++;
    const seen = job.postedAt ?? job.createdAt;
    if (!cur.lastAt || seen > cur.lastAt) cur.lastAt = seen;
    out.set(job.companyId, cur);
  }
  return out;
}

export function agoShort(date: Date): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
