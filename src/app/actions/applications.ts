"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ApplicationStatus } from "@/generated/prisma/enums";

export async function updateApplicationStatus(
  matchId: string,
  status: ApplicationStatus,
  note: string | null,
  appliedAt: Date | null,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const match = await prisma.match.findFirst({
    where: { id: matchId, trackedCompany: { userId: user.id } },
  });
  if (!match) return { error: "Not found" };

  await prisma.match.update({
    where: { id: matchId },
    data: {
      applicationStatus: status,
      // Only write note/date when explicitly provided (don't wipe on other status changes)
      ...(note !== null ? { applicationNote: note } : {}),
      ...(appliedAt !== null ? { appliedAt } : {}),
      // NOT_INTERESTED also dismisses from the default matches view
      ...(status === ApplicationStatus.NOT_INTERESTED ? { dismissed: true } : {}),
    },
  });

  revalidatePath("/matches");
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { success: true };
}
