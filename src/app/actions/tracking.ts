"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { trackServerEvent } from "@/lib/analytics-node";
import type { JobType } from "@/generated/prisma/enums";

export async function followCompany(
  companyId: string,
  source: "browse" | "collection" | "company_page" = "browse",
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const priorCount = await prisma.trackedCompany.count({ where: { userId: user.id } });

  await prisma.trackedCompany.upsert({
    where: { userId_companyId: { userId: user.id, companyId } },
    create: { userId: user.id, companyId, keywords: [], jobTypes: [], emailAlerts: true },
    update: {},
  });

  await trackServerEvent(user.id, "company_tracked", { company_id: companyId, source });
  if (priorCount === 0) {
    await trackServerEvent(user.id, "first_company_tracked", { company_id: companyId, source });
  }

  revalidatePath("/companies");
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

  revalidatePath("/companies");
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

  revalidatePath("/dashboard");
  revalidatePath("/collections");
  revalidatePath("/companies");
  return { success: true };
}

// Kept for API route backward compat (/api/tracked/[id] PATCH)
export async function updateCriteria(
  trackedId: string,
  criteria: {
    keywords: string[];
    jobTypes: JobType[];
    remoteOnly: boolean | null;
    locationFilter: string | null;
    emailAlerts: boolean;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const existing = await prisma.trackedCompany.findFirst({
    where: { id: trackedId, userId: user.id },
  });
  if (!existing) return { error: "Not found" };

  await prisma.trackedCompany.update({ where: { id: trackedId }, data: criteria });

  revalidatePath("/dashboard");
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
