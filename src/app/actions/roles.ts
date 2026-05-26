"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { backfillMatchesForUser } from "./tracking";

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

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
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

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
}
