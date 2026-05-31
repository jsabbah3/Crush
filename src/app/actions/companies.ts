"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { detectAts } from "@/lib/detect-ats";
import { backfillMatchesForUser } from "./tracking";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export type AddCompanyResult =
  | { status: "exists";   companyId: string; slug: string }
  | { status: "added";    companyId: string; slug: string; atsFound: boolean; jobCount: number }
  | { status: "error";    message: string };

export async function addCustomCompany(
  name: string,
  website: string,
): Promise<AddCompanyResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Not logged in" };

  const trimName    = name.trim();
  const trimWebsite = website.trim() || null;
  if (!trimName) return { status: "error", message: "Company name is required" };

  // Normalise website
  let websiteUrl: string | null = trimWebsite;
  if (websiteUrl && !websiteUrl.startsWith("http")) websiteUrl = `https://${websiteUrl}`;

  // Check if already exists
  const existing = await prisma.company.findFirst({
    where: { name: { equals: trimName, mode: "insensitive" } },
  });
  if (existing) {
    // If this company has no ATS connected, try to detect and wire it up now
    if (!existing.sourceId) {
      const atsMatch = await detectAts(trimName, websiteUrl ?? existing.website);
      if (atsMatch) {
        await prisma.company.update({
          where: { id: existing.id },
          data: { sourceType: atsMatch.type, sourceId: atsMatch.slug },
        });
        try {
          const { ingestCompanyById } = await import("@/lib/ingestion/index");
          await ingestCompanyById(existing.id);
        } catch {
          // Non-fatal
        }
      }
    }

    // Follow it if not already followed, then return
    await prisma.trackedCompany.upsert({
      where: { userId_companyId: { userId: user.id, companyId: existing.id } },
      create: { userId: user.id, companyId: existing.id, keywords: [], jobTypes: [], emailAlerts: true },
      update: {},
    });
    await backfillMatchesForUser(user.id);
    revalidatePath("/companies");
    revalidatePath("/dashboard");
    return { status: "exists", companyId: existing.id, slug: existing.slug };
  }

  // Detect ATS
  const atsMatch = await detectAts(trimName, websiteUrl);

  // Build unique slug
  let baseSlug = toSlug(trimName);
  let slug = baseSlug;
  let suffix = 2;
  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  // Create company
  const company = await prisma.company.create({
    data: {
      name:       trimName,
      slug,
      website:    websiteUrl,
      sourceType: atsMatch ? atsMatch.type : "manual",
      sourceId:   atsMatch ? atsMatch.slug : null,
    },
  });

  // Ingest jobs immediately if ATS found
  let jobCount = 0;
  if (atsMatch) {
    try {
      const { ingestCompanyById } = await import("@/lib/ingestion/index");
      const result = await ingestCompanyById(company.id);
      jobCount = result.newJobs;
    } catch {
      // Ingestion failure is non-fatal — company is still created
    }
  }

  // Auto-follow for the user who added it
  await prisma.trackedCompany.create({
    data: { userId: user.id, companyId: company.id, keywords: [], jobTypes: [], emailAlerts: true },
  });

  await backfillMatchesForUser(user.id);
  revalidatePath("/companies");
  revalidatePath("/dashboard");

  return {
    status:   "added",
    companyId: company.id,
    slug,
    atsFound:  !!atsMatch,
    jobCount,
  };
}
