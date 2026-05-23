"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AlertMode } from "@/generated/prisma/enums";

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function updateAlertMode(mode: AlertMode) {
  const userId = await currentUserId();
  if (!userId) return { error: "Unauthorized" };

  await prisma.user.update({
    where: { id: userId },
    data: { alertMode: mode },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function setAlertsPaused(paused: boolean) {
  const userId = await currentUserId();
  if (!userId) return { error: "Unauthorized" };

  await prisma.user.update({
    where: { id: userId },
    data: { alertsPaused: paused },
  });

  revalidatePath("/settings");
  return { success: true };
}
