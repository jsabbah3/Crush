import { prisma } from "@/lib/prisma";
import { doesJobMatch } from "@/lib/matching";
import { fetchGreenhouseJobs } from "./greenhouse";
import { fetchLeverJobs } from "./lever";
import { fetchAshbyJobs } from "./ashby";
import { fetchGemJobs } from "./gem";
import { fetchRemotiveJobs, normalizeCompanyName } from "./remotive";
import { fetchTheMuseJobs } from "./the-muse";
import type { IngestedJob } from "./normalize";

type UserPrefs = {
  seniority?: string[];
  remoteOnly?: boolean | null;
  locationFilter?: string | null;
};

export type IngestionResult = {
  companiesProcessed: number;
  newJobs: number;
  newMatches: number;
  errors: string[];
};

// ── shared: persist new jobs + create matches ─────────────────────────────────

async function persistJobs(
  companyId: string,
  companySlug: string,
  fetched: IngestedJob[],
): Promise<{ newJobs: number; newMatches: number }> {
  if (fetched.length === 0) return { newJobs: 0, newMatches: 0 };

  const existingIds = await prisma.job.findMany({
    where: {
      companyId,
      externalJobId: { in: fetched.map((j) => j.externalJobId) },
    },
    select: { externalJobId: true },
  });
  const existingSet = new Set(existingIds.map((j) => j.externalJobId));

  const incoming = fetched.filter((j) => !existingSet.has(j.externalJobId));
  if (incoming.length === 0) return { newJobs: 0, newMatches: 0 };

  // First-ever ingest of this company (it had no jobs at all before now):
  // its current roles are backfill, not "just opened". Without this, sourcing
  // a company that was previously unsourced (e.g. via scripts/detect-and-source
  // or ingest-on-follow) would blast every tracker a "just opened" alert for
  // long-standing roles. Established companies keep alerting on genuinely new
  // postings.
  const companyHadJobs = (await prisma.job.count({ where: { companyId } })) > 0;

  const created = await prisma.job.createManyAndReturn({
    data: incoming.map((job) => ({
      title: job.title.trim(),
      slug: buildSlug(companySlug, job.externalJobId),
      description: job.description,
      type: job.type,
      location: job.location?.trim() || null,
      remote: job.remote,
      url: job.url,
      postedAt: job.postedAt,
      externalJobId: job.externalJobId,
      companyId,
      salaryMin: job.salaryMin ?? null,
      salaryMax: job.salaryMax ?? null,
      currency: job.currency ?? "USD",
    })),
    skipDuplicates: true,
  });

  const tracked = await prisma.trackedCompany.findMany({
    where: { companyId, emailAlerts: true },
    include: { user: { select: { defaultCriteria: true } } },
  });

  const userIds = [...new Set(tracked.map((tc) => tc.userId))];
  const roleRows = await prisma.trackedRole.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, title: true },
  });
  const rolesByUserId = new Map<string, string[]>();
  for (const r of roleRows) {
    if (!rolesByUserId.has(r.userId)) rolesByUserId.set(r.userId, []);
    rolesByUserId.get(r.userId)!.push(r.title);
  }

  let newMatches = 0;
  for (const job of created) {
    for (const tc of tracked) {
      const prefs = tc.user.defaultCriteria as UserPrefs | null;
      const userRoles = rolesByUserId.get(tc.userId) ?? [];
      if (
        doesJobMatch(
          job,
          userRoles,
          prefs?.seniority ?? [],
          prefs?.remoteOnly ?? null,
          prefs?.locationFilter ?? null,
        )
      ) {
        try {
          await prisma.match.create({
            data: { trackedCompanyId: tc.id, jobId: job.id, notified: !companyHadJobs },
          });
          newMatches++;
        } catch {
          // Unique constraint — match already exists
        }
      }
    }
  }

  return { newJobs: created.length, newMatches };
}

// ── ATS sources: Greenhouse / Lever / Ashby ───────────────────────────────────

/**
 * Close any jobs in our DB that are no longer present in the ATS feed.
 * Only called for ATS sources where the API returns the complete active listing.
 * Returns the number of jobs closed.
 */
async function closeStaleJobs(companyId: string, fetchedIds: string[]): Promise<number> {
  if (fetchedIds.length === 0) return 0; // Safety: don't close everything if the fetch returned nothing

  const fetchedSet = new Set(fetchedIds);

  const activeJobs = await prisma.job.findMany({
    where: { companyId, status: "ACTIVE" },
    select: { id: true, externalJobId: true },
  });

  const staleIds = activeJobs
    .filter((j) => j.externalJobId && !fetchedSet.has(j.externalJobId))
    .map((j) => j.id);

  if (staleIds.length === 0) return 0;

  await prisma.job.updateMany({
    where: { id: { in: staleIds } },
    data: { status: "CLOSED" },
  });

  return staleIds.length;
}

async function runAtsIngestion(): Promise<IngestionResult> {
  const companies = await prisma.company.findMany({
    where: {
      sourceType: { in: ["greenhouse", "lever", "ashby", "gem"] },
      sourceId: { not: null },
    },
  });

  let newJobs = 0;
  let newMatches = 0;
  const errors: string[] = [];

  for (const company of companies) {
    try {
      const jobs = await fetchAtsJobs(company.sourceType, company.sourceId!);
      if (jobs.length === 0) {
        // Log a warning — could be a wrong ATS slug or a genuine hiring pause
        errors.push(`[ATS:zero-jobs] ${company.name} (${company.sourceType}/${company.sourceId}) returned 0 jobs — may need re-validation`);
      }
      const [r] = await Promise.all([
        persistJobs(company.id, company.slug, jobs),
        closeStaleJobs(company.id, jobs.map((j) => j.externalJobId)),
      ]);
      newJobs += r.newJobs;
      newMatches += r.newMatches;
    } catch (err) {
      errors.push(`[ATS] ${company.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { companiesProcessed: companies.length, newJobs, newMatches, errors };
}

function fetchAtsJobs(sourceType: string, sourceId: string): Promise<IngestedJob[]> {
  switch (sourceType) {
    case "greenhouse": return fetchGreenhouseJobs(sourceId);
    case "lever":      return fetchLeverJobs(sourceId);
    case "ashby":      return fetchAshbyJobs(sourceId);
    case "gem":        return fetchGemJobs(sourceId);
    default:           return Promise.resolve([]);
  }
}

// ── Aggregate sources: Remotive / The Muse ────────────────────────────────────
// Fetch all jobs in bulk, then match by normalised company name.

/**
 * Close aggregate-sourced jobs that disappeared from their source feed.
 * Only valid for sources whose feed is a COMPLETE listing (Remotive is a
 * single full dump; The Muse is paginated with a page cap, so absence
 * there does NOT mean the job is gone — never call this for it).
 * External ids are source-prefixed, so scoping by prefix can't touch
 * ATS-managed jobs. The floor guard protects against a half-broken feed
 * response mass-closing live jobs.
 */
async function closeMissingAggregateJobs(
  idPrefix: string,
  fetchedIds: Set<string>,
  minFeedSize: number,
): Promise<number> {
  if (fetchedIds.size < minFeedSize) return 0;

  const active = await prisma.job.findMany({
    where: { status: "ACTIVE", externalJobId: { startsWith: idPrefix } },
    select: { id: true, externalJobId: true },
  });
  const staleIds = active
    .filter((j) => j.externalJobId && !fetchedIds.has(j.externalJobId))
    .map((j) => j.id);
  if (staleIds.length === 0) return 0;

  await prisma.job.updateMany({
    where: { id: { in: staleIds } },
    data: { status: "CLOSED" },
  });
  return staleIds.length;
}

async function runAggregateIngestion(
  label: string,
  fetchAll: () => Promise<Map<string, IngestedJob[]>>,
  closeMissing?: { idPrefix: string; minFeedSize: number },
): Promise<IngestionResult> {
  const jobsByName = await fetchAll();

  const companies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true },
  });

  let companiesProcessed = 0;
  let newJobs = 0;
  let newMatches = 0;
  const errors: string[] = [];

  for (const company of companies) {
    const jobs = jobsByName.get(normalizeCompanyName(company.name));
    if (!jobs?.length) continue;

    companiesProcessed++;
    try {
      const r = await persistJobs(company.id, company.slug, jobs);
      newJobs += r.newJobs;
      newMatches += r.newMatches;
    } catch (err) {
      errors.push(`[${label}] ${company.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (closeMissing) {
    try {
      const allFetchedIds = new Set<string>();
      for (const jobs of jobsByName.values()) {
        for (const j of jobs) allFetchedIds.add(j.externalJobId);
      }
      await closeMissingAggregateJobs(closeMissing.idPrefix, allFetchedIds, closeMissing.minFeedSize);
    } catch (err) {
      errors.push(`[${label}:close-missing] ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { companiesProcessed, newJobs, newMatches, errors };
}

// ── main entry point ──────────────────────────────────────────────────────────

export async function ingestCompanyById(companyId: string): Promise<{ newJobs: number; newMatches: number }> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company || !company.sourceId || company.sourceType === "manual") return { newJobs: 0, newMatches: 0 };
  const jobs = await fetchAtsJobs(company.sourceType, company.sourceId);
  const [result] = await Promise.all([
    persistJobs(company.id, company.slug, jobs),
    closeStaleJobs(company.id, jobs.map((j) => j.externalJobId)),
  ]);
  return result;
}

export async function runIngestion(): Promise<IngestionResult> {
  const results = await Promise.allSettled([
    runAtsIngestion(),
    // Remotive's API returns its complete active listing, so jobs absent
    // from the feed are genuinely closed. (The Muse is page-capped — its
    // absence means nothing, so it gets no closeMissing config.)
    runAggregateIngestion("Remotive", fetchRemotiveJobs, {
      idPrefix: "remotive-",
      minFeedSize: 100,
    }),
    runAggregateIngestion("The Muse", fetchTheMuseJobs),
  ]);

  return results.reduce<IngestionResult>(
    (acc, r) => {
      if (r.status === "fulfilled") {
        acc.companiesProcessed += r.value.companiesProcessed;
        acc.newJobs += r.value.newJobs;
        acc.newMatches += r.value.newMatches;
        acc.errors.push(...r.value.errors);
      } else {
        acc.errors.push(String(r.reason));
      }
      return acc;
    },
    { companiesProcessed: 0, newJobs: 0, newMatches: 0, errors: [] },
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function buildSlug(companySlug: string, externalJobId: string): string {
  const safe = externalJobId.replace(/[^a-z0-9-]/gi, "-").toLowerCase().slice(0, 40);
  return `${companySlug}-${safe}`;
}
