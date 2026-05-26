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

  const created = await prisma.job.createManyAndReturn({
    data: incoming.map((job) => ({
      title: job.title,
      slug: buildSlug(companySlug, job.externalJobId),
      description: job.description,
      type: job.type,
      location: job.location,
      remote: job.remote,
      url: job.url,
      postedAt: job.postedAt,
      externalJobId: job.externalJobId,
      companyId,
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
          await prisma.match.create({ data: { trackedCompanyId: tc.id, jobId: job.id } });
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
      const r = await persistJobs(company.id, company.slug, jobs);
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

async function runAggregateIngestion(
  label: string,
  fetchAll: () => Promise<Map<string, IngestedJob[]>>,
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

  return { companiesProcessed, newJobs, newMatches, errors };
}

// ── main entry point ──────────────────────────────────────────────────────────

export async function runIngestion(): Promise<IngestionResult> {
  const results = await Promise.allSettled([
    runAtsIngestion(),
    runAggregateIngestion("Remotive", fetchRemotiveJobs),
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
