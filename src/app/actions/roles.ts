"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { backfillMatchesForUser } from "./tracking";
import { doesJobMatch } from "@/lib/matching";

export async function addTrackedRole(title: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const normalized = title.trim();
  if (!normalized) return { error: "Title required" };

  try {
    await prisma.trackedRole.create({
      data: { userId: user.id, title: normalized },
    });
  } catch {
    // Unique constraint — already tracking this role
  }

  // Backfill matches across all followed companies with the new role
  await backfillMatchesForUser(user.id);

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
}

export async function removeTrackedRole(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  await prisma.trackedRole.deleteMany({
    where: { id, userId: user.id },
  });

  // Dismiss matches that no longer fit the remaining roles
  await pruneStaleMatches(user.id);

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/matches");
  return { success: true };
}

type UserPrefs = { seniority?: string[]; remoteOnly?: boolean | null; locationFilter?: string | null };

async function pruneStaleMatches(userId: string) {
  const [dbUser, roles, trackedCompanies] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { defaultCriteria: true } }),
    prisma.trackedRole.findMany({ where: { userId }, select: { title: true } }),
    prisma.trackedCompany.findMany({ where: { userId }, select: { id: true } }),
  ]);

  const prefs = dbUser?.defaultCriteria as UserPrefs | null;
  const roleTitles = roles.map(r => r.title);
  const tcIds = trackedCompanies.map(tc => tc.id);
  if (tcIds.length === 0) return;

  // Fetch all undismissed matches with their job data
  const matches = await prisma.match.findMany({
    where: { trackedCompanyId: { in: tcIds }, dismissed: false },
    include: { job: true },
  });

  const toStaleIds: string[] = [];
  for (const match of matches) {
    // If no roles left, everything is stale
    if (roleTitles.length === 0) { toStaleIds.push(match.id); continue; }
    if (!doesJobMatch(match.job, roleTitles, prefs?.seniority ?? [], prefs?.remoteOnly ?? null, prefs?.locationFilter ?? null)) {
      toStaleIds.push(match.id);
    }
  }

  if (toStaleIds.length > 0) {
    await prisma.match.updateMany({
      where: { id: { in: toStaleIds } },
      data: { dismissed: true },
    });
  }
}

export async function saveUserPreferences(prefs: {
  seniority: string[];
  remoteOnly: boolean | null;
  locationFilter: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  await prisma.user.update({
    where: { id: user.id },
    data: { defaultCriteria: prefs },
  });

  // Prune matches that no longer fit tightened criteria, then backfill for loosened ones
  await pruneStaleMatches(user.id);
  await backfillMatchesForUser(user.id);

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
}
