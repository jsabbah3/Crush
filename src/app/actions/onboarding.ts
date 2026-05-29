"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type Criteria = {
  roles: string[];
  seniority: string[];
  remoteOnly: boolean | null;
  locationFilter: string | null;
  linkedinUrl?: string | null;
  currentTitle?: string | null;
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
        defaultCriteria: {
          seniority: criteria.seniority,
          remoteOnly: criteria.remoteOnly,
          locationFilter: criteria.locationFilter,
        },
        onboardingComplete: true,
        ...(criteria.linkedinUrl != null && { linkedinUrl: criteria.linkedinUrl }),
        ...(criteria.currentTitle != null && { currentTitle: criteria.currentTitle }),
      },
    });

    for (const title of criteria.roles) {
      try {
        await tx.trackedRole.create({
          data: { userId: authUser.id, title: title.trim() },
        });
      } catch {
        // Duplicate — skip
      }
    }

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
              keywords: [],
              jobTypes: [],
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
