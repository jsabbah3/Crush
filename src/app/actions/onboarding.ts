"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { JobType } from "@/generated/prisma/enums";

type Criteria = {
  keywords: string[];
  jobTypes: JobType[];
  remoteOnly: boolean | null;
  locationFilter: string | null;
};

export async function saveOnboarding(
  criteria: Criteria,
  collectionSlug: string | null
) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: authUser.id },
      data: {
        defaultCriteria: criteria,
        onboardingComplete: true,
      },
    });

    if (collectionSlug) {
      const collection = await tx.collection.findUnique({
        where: { slug: collectionSlug },
        include: { companies: { select: { companyId: true } } },
      });

      if (collection) {
        for (const { companyId } of collection.companies) {
          await tx.trackedCompany.upsert({
            where: { userId_companyId: { userId: authUser.id, companyId } },
            create: {
              userId: authUser.id,
              companyId,
              keywords: criteria.keywords,
              jobTypes: criteria.jobTypes,
              remoteOnly: criteria.remoteOnly,
              locationFilter: criteria.locationFilter,
              emailAlerts: true,
            },
            update: {},
          });
        }
      }
    }
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function skipOnboarding() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  await prisma.user.update({
    where: { id: authUser.id },
    data: { onboardingComplete: true },
  });

  redirect("/dashboard");
}
