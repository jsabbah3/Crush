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
    include: { job: { select: { companyId: true, title: true } } },
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

  // The same role is often posted once per location. The inbox shows those as
  // one card, so once you act on one, the duplicates leave the inbox too.
  if (status !== ApplicationStatus.INTERESTED) {
    await prisma.match.updateMany({
      where: {
        id: { not: matchId },
        trackedCompany: { userId: user.id },
        applicationStatus: ApplicationStatus.INTERESTED,
        dismissed: false,
        job: {
          companyId: match.job.companyId,
          title: { equals: match.job.title.trim(), mode: "insensitive" },
        },
      },
      data: { dismissed: true },
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}
