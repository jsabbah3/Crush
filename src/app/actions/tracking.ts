"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { trackServerEvent } from "@/lib/analytics-node";
import { doesJobMatch } from "@/lib/matching";
import { ingestCompanyById } from "@/lib/ingestion";

type UserPrefs = {
  seniority?: string[];
  remoteOnly?: boolean | null;
  locationFilter?: string | null;
};

/**
 * Backfill matches for a user against already-ingested active jobs.
 * Called when a user follows a company or adds a new role title.
 *
 * @param userId
 * @param companyIds - if provided, only check jobs from these companies (follow flow)
 *                    if null, check all tracked companies (add-role flow)
 */
export async function backfillMatchesForUser(userId: string) {
  // Exported from a "use server" module, so this is a callable endpoint:
  // verify the caller is acting on their own account.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return 0;
  return backfillMatches(userId, null);
}

export async function refreshMatches(): Promise<{ created: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { created: 0 };
  const created = (await backfillMatches(user.id, null)) ?? 0;
  revalidatePath("/matches");
  revalidatePath("/dashboard");
  return { created };
}

async function backfillMatches(userId: string, companyIds: string[] | null) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultCriteria: true },
  });
  const prefs = dbUser?.defaultCriteria as UserPrefs | null;

  const roles = await prisma.trackedRole.findMany({
    where: { userId },
    select: { title: true },
  });
  const roleTitles = roles.map((r) => r.title);
  if (roleTitles.length === 0) return 0; // no roles set — nothing to match

  // Get the relevant TrackedCompany rows
  const trackedCompanies = await prisma.trackedCompany.findMany({
    where: {
      userId,
      ...(companyIds ? { companyId: { in: companyIds } } : {}),
    },
    select: { id: true, companyId: true },
  });
  if (trackedCompanies.length === 0) return 0;

  const trackedCompanyIds = trackedCompanies.map((tc) => tc.companyId);

  // Fetch active jobs for those companies
  const jobs = await prisma.job.findMany({
    where: {
      companyId: { in: trackedCompanyIds },
      status: "ACTIVE",
    },
  });

  // Build a map from companyId → trackedCompanyId
  const tcMap = new Map(trackedCompanies.map((tc) => [tc.companyId, tc.id]));

  let created = 0;
  for (const job of jobs) {
    if (!doesJobMatch(
      job,
      roleTitles,
      prefs?.seniority ?? [],
      prefs?.remoteOnly ?? null,
      prefs?.locationFilter ?? null,
    )) continue;

    const trackedCompanyId = tcMap.get(job.companyId);
    if (!trackedCompanyId) continue;

    // Upsert: create if missing, un-dismiss if it was auto-dismissed by role removal
    const existing = await prisma.match.findFirst({ where: { trackedCompanyId, jobId: job.id } });
    if (!existing) {
      try {
        // notified: true — backfilled matches are for roles that were already
        // open when the user followed; they belong on the dashboard but must
        // not trigger a "just opened" alert email.
        await prisma.match.create({ data: { trackedCompanyId, jobId: job.id, notified: true } });
        created++;
      } catch {
        // Race condition — fine
      }
    } else if (existing.dismissed) {
      await prisma.match.update({ where: { id: existing.id }, data: { dismissed: false } });
      created++;
    }
  }
  return created;
}

export async function followCompany(
  companyId: string,
  source: "browse" | "collection" | "company_page" | "anon_replay" = "browse",
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const priorCount = await prisma.trackedCompany.count({ where: { userId: user.id } });

  // Populate this company's roles now instead of waiting for the daily cron,
  // so a just-followed company shows its openings immediately. Runs BEFORE the
  // user starts tracking it, so the ingest itself creates no matches for them
  // (backfillMatches below handles those, as backfill — no "just opened" email).
  // Best-effort: a slow/failed ATS fetch must not fail the follow. No-op for
  // unsourced companies (ingestCompanyById returns early).
  try {
    await ingestCompanyById(companyId);
  } catch (err) {
    console.error("ingest-on-follow failed", companyId, err);
  }

  await prisma.trackedCompany.upsert({
    where: { userId_companyId: { userId: user.id, companyId } },
    create: { userId: user.id, companyId, keywords: [], jobTypes: [], emailAlerts: true },
    update: {},
  });

  await trackServerEvent(user.id, "company_tracked", { company_id: companyId, source });
  if (priorCount === 0) {
    await trackServerEvent(user.id, "first_company_tracked", { company_id: companyId, source });
  }

  // Backfill matches for jobs already in the DB at this company
  await backfillMatches(user.id, [companyId]);

  revalidatePath("/companies", "page");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function untrackCompany(trackedId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const existing = await prisma.trackedCompany.findFirst({
    where: { id: trackedId, userId: user.id },
  });
  if (!existing) return { error: "Not found" };

  await prisma.trackedCompany.delete({ where: { id: trackedId } });

  await trackServerEvent(user.id, "company_untracked", { company_id: existing.companyId });

  revalidatePath("/companies", "page");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function trackCollection(companyIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  for (const companyId of companyIds) {
    await prisma.trackedCompany.upsert({
      where: { userId_companyId: { userId: user.id, companyId } },
      create: { userId: user.id, companyId, keywords: [], jobTypes: [], emailAlerts: true },
      update: {},
    });
  }

  await backfillMatches(user.id, companyIds);

  revalidatePath("/dashboard");
  revalidatePath("/collections");
  revalidatePath("/companies");
  return { success: true };
}

export async function dismissMatch(matchId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const match = await prisma.match.findFirst({
    where: { id: matchId, trackedCompany: { userId: user.id } },
  });
  if (!match) return { error: "Not found" };

  await prisma.match.update({ where: { id: matchId }, data: { dismissed: true } });

  revalidatePath("/matches");
  revalidatePath("/dashboard");
  return { success: true };
}
