import { prisma } from "@/lib/prisma";
import { relevantCompanyWhere } from "@/lib/company-relevance";
import { doesJobMatch, expandRoleTitles } from "@/lib/matching";

type Prefs = {
  seniority?: string[];
  remoteOnly?: boolean | null;
  locationFilter?: string | null;
} | null;

const WINDOW_DAYS = 30;
const MAX_JOBS = 120;

/**
 * Roles like yours, open now, at companies NOT on your list — so the list can
 * grow from evidence rather than guesswork. Uses the same matcher as alerts.
 * Companies in the industries already on your list come first ("similar"),
 * then everyone else.
 */
export async function getAlsoOpen(
  trackedCompanyIds: string[],
  roleTitles: string[],
  prefs: Prefs,
) {
  if (roleTitles.length === 0) return [];

  // Two-letter abbreviations ("ae", "pm") would make this LIKE pre-filter match
  // nearly every title; the full matcher below still recognises them.
  const variants = expandRoleTitles(roleTitles).filter((v) => v.trim().length >= 3);
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

  const industries = trackedCompanyIds.length
    ? (
        await prisma.company.findMany({
          where: { id: { in: trackedCompanyIds }, industry: { not: null } },
          select: { industry: true },
          distinct: ["industry"],
        })
      ).map((c) => c.industry!)
    : [];

  const candidates = await prisma.job.findMany({
    where: {
      status: "ACTIVE",
      companyId: trackedCompanyIds.length ? { notIn: trackedCompanyIds } : undefined,
      company: relevantCompanyWhere,
      AND: [
        { OR: [{ postedAt: { gte: since } }, { postedAt: null, createdAt: { gte: since } }] },
        { OR: variants.map((v) => ({ title: { contains: v, mode: "insensitive" as const } })) },
      ],
    },
    include: { company: { select: { name: true, slug: true, website: true, industry: true } } },
    orderBy: [{ postedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 800,
  });

  const fits = candidates.filter((j) =>
    doesJobMatch(j, roleTitles, prefs?.seniority ?? [], prefs?.remoteOnly ?? null, prefs?.locationFilter ?? null),
  );

  const similar = new Set(industries);
  // Stable sort: same-industry companies first, newest first within each.
  fits.sort((a, b) => Number(similar.has(b.company.industry ?? "")) - Number(similar.has(a.company.industry ?? "")));

  return fits.slice(0, MAX_JOBS).map((j) => ({
    at: j.postedAt ?? j.createdAt,
    similar: similar.has(j.company.industry ?? ""),
    job: {
      id: j.id, title: j.title, type: j.type, location: j.location, remote: j.remote,
      salaryMin: j.salaryMin, salaryMax: j.salaryMax, currency: j.currency, url: j.url,
      postedAt: j.postedAt, companyId: j.companyId,
      company: { name: j.company.name, slug: j.company.slug, website: j.company.website },
    },
  }));
}
