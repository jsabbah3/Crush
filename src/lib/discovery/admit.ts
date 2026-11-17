import { prisma } from "@/lib/prisma";
import { detectAts } from "@/lib/detect-ats";
import { fetchAtsJobs, ingestCompanyById } from "@/lib/ingestion";
import { isUS } from "@/lib/location";
import type { CompanySource, FundingStage } from "@/generated/prisma/enums";

/**
 * Deciding what gets onto Crush.
 *
 * A candidate (a YC company, a startup in the funding news) becomes a public
 * company only once we can read a job board with open roles — before that it
 * may exist in the database, but the relevance gate keeps it off every list.
 * So "good companies" = reputable source + a board we can actually watch.
 */

export type Candidate = {
  name: string;
  website: string | null;
  /** "YC Fall 2026", "Funding news: Series B $40M" */
  via: string;
  tags?: string[];
  description?: string | null;
  industry?: string | null;
  /** The source says it's US-based (YC regions, or the news says so). */
  usBased?: boolean;
  funding?: {
    round: string;
    amountM: number | null;
    investors: string[];
    sourceUrl: string;
    publishedAt: Date;
  };
};

export type AdmitResult = { outcome: "new" | "updated" | "skipped"; listed: boolean; reason?: string };

// Investment firms raising their own funds are not startups to work at.
const INVESTOR_NAME = /\b(?:ventures?|capital|partners|fund|funds|investments?|holdings|asset management|vc|equity|angels?)\b/i;

const RECHECK_MS = 14 * 86_400_000;

/** A role someone in the US can take: located in the US, or remote with no
 *  region / a US region ("Remote", "Remote - US") — not "Remote - UK". */
export function usOpen(j: { location: string | null; remote: boolean }): boolean {
  const loc = (j.location ?? "").trim();
  if (loc && isUS(loc)) return true;
  return j.remote && (!loc || /^(?:remote|anywhere|worldwide|global|distributed)$/i.test(loc));
}


export function host(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export function fundingStage(round: string): FundingStage | null {
  const r = round.toLowerCase();
  if (r.includes("pre-seed") || r.includes("pre seed")) return "pre_seed";
  if (r.includes("seed")) return "seed";
  if (r.includes("series a")) return "series_a";
  if (r.includes("series b")) return "series_b";
  if (r.includes("series c")) return "series_c";
  if (r.includes("series d") || r.includes("series e") || r.includes("growth")) return "growth";
  return null;
}

export function fundingLine(f: { round: string; amountM: number | null }): string {
  const amt = f.amountM == null ? "" : f.amountM >= 1000 ? `$${(f.amountM / 1000).toFixed(1)}B ` : `$${Math.round(f.amountM)}M `;
  return `${amt}${f.round}`;
}

async function findExisting(c: Candidate) {
  const h = host(c.website);
  if (h) {
    const byHost = await prisma.company.findFirst({
      where: { OR: [{ website: { contains: h, mode: "insensitive" } }] },
    });
    if (byHost && host(byHost.website) === h) return byHost;
  }
  return prisma.company.findFirst({ where: { name: { equals: c.name, mode: "insensitive" } } });
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "company";
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await prisma.company.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${base}-${Date.now()}`;
}

/**
 * Find and attach a job board, then pull its roles. A board counts only if:
 *  - it's really theirs: without a website, the board slug must be the full
 *    company name; and at least one posting must mention the company (or its
 *    domain) — "Autumn Labs" must not get some other "autumn" board;
 *  - it has a role a Crush user could take: in the US, or remote.
 */
async function attachBoard(companyId: string, name: string, website: string | null, usBased = false): Promise<boolean> {
  const match = await detectAts(name, website);
  const fullSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  let trusted = !!match && (!!website || (match.slug.replace(/-/g, "") === fullSlug && fullSlug.length >= 5));

  if (match && trusted) {
    const jobs = await fetchAtsJobs(match.type, match.slug).catch(() => []);
    const stem = host(website)?.split(".")[0] ?? "";
    const names = [name.toLowerCase(), ...(stem.length >= 4 ? [stem] : [])];
    const mentions = jobs.slice(0, 10).some((j) => names.some((n) => `${j.title} ${j.description}`.toLowerCase().includes(n)));
    const usRole = jobs.some((j) => usOpen(j));
    trusted = mentions && (usRole || usBased);
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      atsCheckedAt: new Date(),
      ...(trusted && match ? { sourceType: match.type as CompanySource, sourceId: match.slug } : {}),
    },
  });
  if (!trusted) return false;
  try {
    await ingestCompanyById(companyId);
  } catch (err) {
    console.error("ingest after discovery failed", name, err);
  }
  const listed = await prisma.company.findUnique({ where: { id: companyId }, select: { listedAt: true } });
  return !!listed?.listedAt;
}

export async function admit(c: Candidate): Promise<AdmitResult> {
  if (INVESTOR_NAME.test(c.name)) return { outcome: "skipped", listed: false, reason: "investment firm" };

  const fundedAt = c.funding?.publishedAt ?? null;
  const stage = c.funding ? fundingStage(c.funding.round) : null;
  const existing = await findExisting(c);

  let companyId: string;
  let outcome: AdmitResult["outcome"];
  let needsBoard: boolean;

  if (existing) {
    companyId = existing.id;
    outcome = "updated";
    const tags = [...new Set([...existing.tags, ...(c.tags ?? [])])];
    await prisma.company.update({
      where: { id: existing.id },
      data: {
        tags,
        discoveredVia: existing.discoveredVia ?? c.via,
        description: existing.description ?? c.description ?? undefined,
        industry: existing.industry ?? c.industry ?? undefined,
        website: existing.website ?? c.website ?? undefined,
        ...(fundedAt && (!existing.recentlyFundedAt || existing.recentlyFundedAt < fundedAt)
          ? { recentlyFundedAt: fundedAt, ...(stage ? { fundingStage: stage } : {}) }
          : {}),
      },
    });
    needsBoard =
      existing.sourceType === "manual" &&
      (!existing.atsCheckedAt || Date.now() - existing.atsCheckedAt.getTime() > RECHECK_MS);
  } else {
    // A company from the news with no website gets created only if we can
    // find its board — otherwise there's nothing to show or watch.
    if (!c.website) {
      const match = await detectAts(c.name, null);
      const fullSlug = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!match || match.slug.replace(/-/g, "") !== fullSlug || fullSlug.length < 5) {
        return { outcome: "skipped", listed: false, reason: "no website or board" };
      }
    }
    const created = await prisma.company.create({
      data: {
        name: c.name,
        slug: await uniqueSlug(c.name),
        website: c.website,
        description: c.description ?? null,
        industry: c.industry ?? null,
        tags: c.tags ?? [],
        discoveredVia: c.via,
        recentlyFundedAt: fundedAt,
        fundingStage: stage,
      },
    });
    companyId = created.id;
    outcome = "new";
    needsBoard = true;
  }

  if (c.funding) {
    await prisma.fundingSignal.upsert({
      where: { sourceUrl: c.funding.sourceUrl },
      create: {
        companyName: c.name,
        website: c.website,
        amount: c.funding.amountM == null ? null : fundingLine({ round: "", amountM: c.funding.amountM }).trim(),
        round: c.funding.round,
        investors: c.funding.investors.join("; ") || null,
        sourceUrl: c.funding.sourceUrl,
        status: "added",
        autoApproved: true,
        companyId,
        detectedAt: c.funding.publishedAt,
      },
      update: { companyId },
    });
  }

  const listed = needsBoard ? await attachBoard(companyId, c.name, c.website, c.usBased) : false;
  return { outcome, listed };
}
