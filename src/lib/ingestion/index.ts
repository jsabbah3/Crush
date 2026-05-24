import { prisma } from "@/lib/prisma";
import { doesJobMatch } from "@/lib/matching";
import { fetchGreenhouseJobs } from "./greenhouse";
import { fetchLeverJobs } from "./lever";
import { fetchAshbyJobs } from "./ashby";
import type { IngestedJob } from "./normalize";

export type IngestionResult = {
  companiesProcessed: number;
  newJobs: number;
  newMatches: number;
  errors: string[];
};

export async function runIngestion(): Promise<IngestionResult> {
  const companies = await prisma.company.findMany({
    where: {
      sourceType: { in: ["greenhouse", "lever", "ashby"] },
      sourceId: { not: null },
    },
  });

  let newJobs = 0;
  let newMatches = 0;
  const errors: string[] = [];

  for (const company of companies) {
    try {
      const result = await ingestCompany(company.id, company.slug, company.sourceType, company.sourceId!);
      newJobs += result.newJobs;
      newMatches += result.newMatches;
    } catch (err) {
      errors.push(`${company.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { companiesProcessed: companies.length, newJobs, newMatches, errors };
}

async function ingestCompany(
  companyId: string,
  companySlug: string,
  sourceType: string,
  sourceId: string
): Promise<{ newJobs: number; newMatches: number }> {
  const fetched = await fetchJobs(sourceType, sourceId);
  if (fetched.length === 0) return { newJobs: 0, newMatches: 0 };

  // Find which external IDs already exist so we only process new ones
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

  // Batch insert; skipDuplicates handles any race condition between cron runs using the
  // (companyId, externalJobId) unique constraint. Only actually-inserted rows come back.
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

  // Run matching for new jobs
  const tracked = await prisma.trackedCompany.findMany({
    where: { companyId, emailAlerts: true },
  });

  // Load tracked roles for all relevant users in one query
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

  const matchIds: string[] = [];

  for (const job of created) {
    for (const tc of tracked) {
      const userRoles = rolesByUserId.get(tc.userId) ?? [];
      if (doesJobMatch(job, tc, userRoles)) {
        try {
          const match = await prisma.match.create({
            data: { trackedCompanyId: tc.id, jobId: job.id },
          });
          matchIds.push(match.id);
        } catch {
          // Unique constraint violation means match already exists — skip
        }
      }
    }
  }

  return { newJobs: created.length, newMatches: matchIds.length };
}

async function fetchJobs(sourceType: string, sourceId: string): Promise<IngestedJob[]> {
  switch (sourceType) {
    case "greenhouse":
      return fetchGreenhouseJobs(sourceId);
    case "lever":
      return fetchLeverJobs(sourceId);
    case "ashby":
      return fetchAshbyJobs(sourceId);
    default:
      return [];
  }
}

function buildSlug(companySlug: string, externalJobId: string): string {
  const safe = externalJobId.replace(/[^a-z0-9-]/gi, "-").toLowerCase().slice(0, 40);
  return `${companySlug}-${safe}`;
}
