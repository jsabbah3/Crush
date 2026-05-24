"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

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

  revalidatePath("/dashboard");
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
  return { success: true };
}
