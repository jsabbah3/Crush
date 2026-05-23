import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CompanyLogo } from "@/components/company-logo";
import { FollowButton } from "@/components/follow-button";
import { TrackCollectionButton } from "@/components/track-collection-button";
import type { JobType } from "@/generated/prisma/enums";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const col = await prisma.collection.findUnique({ where: { slug } });
  if (!col) return {};
  return { title: `${col.name} — Collections — Crush`, description: col.description ?? undefined };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const [collection, tracked, dbUser] = await Promise.all([
    prisma.collection.findUnique({
      where: { slug },
      include: {
        companies: {
          include: {
            company: {
              include: { _count: { select: { trackedBy: true } } },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
      },
    }),
    authUser
      ? prisma.trackedCompany.findMany({
          where: { userId: authUser.id },
          select: {
            id: true,
            companyId: true,
            keywords: true,
            jobTypes: true,
            remoteOnly: true,
            locationFilter: true,
            emailAlerts: true,
          },
        })
      : [],
    authUser
      ? prisma.user.findUnique({
          where: { id: authUser.id },
          select: { defaultCriteria: true },
        })
      : null,
  ]);

  const defaultCriteria = dbUser?.defaultCriteria as {
    keywords: string[];
    remoteOnly: boolean | null;
    locationFilter: string | null;
  } | null ?? null;

  if (!collection) notFound();

  const trackedMap = new Map(tracked.map((t) => [t.companyId, t]));
  const trackedIds = new Set(tracked.map((t) => t.companyId));
  const companies = collection.companies.map((cc) => cc.company);

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/collections"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Collections
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold">{collection.name}</h1>
          {collection.description && (
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              {collection.description}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {companies.length} {companies.length === 1 ? "company" : "companies"}
          </p>
        </div>

        <TrackCollectionButton
          collectionName={collection.name}
          collectionSlug={slug}
          companies={companies.map((c) => ({ id: c.id, name: c.name }))}
          trackedIds={trackedIds}
          userId={authUser?.id ?? null}
          defaultCriteria={defaultCriteria}
        />
      </div>

      {/* Company grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {collection.companies.map(({ company }) => {
          const tc = trackedMap.get(company.id) ?? null;
          return (
            <div
              key={company.id}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <CompanyLogo name={company.name} website={company.website} size="md" className="shrink-0" />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <Link
                    href={`/companies/${company.slug}`}
                    className="font-semibold text-sm leading-snug hover:underline underline-offset-2"
                  >
                    {company.name}
                  </Link>
                  {company.industry && (
                    <p className="text-xs text-muted-foreground">{company.industry}</p>
                  )}
                </div>
              </div>

              {company.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {company.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-auto pt-1">
                {company._count.trackedBy > 0 ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3" />
                    {company._count.trackedBy.toLocaleString()} following
                  </span>
                ) : (
                  <span />
                )}
                <FollowButton
                  company={{ id: company.id, name: company.name }}
                  tracked={tc as {
                    id: string;
                    keywords: string[];
                    jobTypes: JobType[];
                    remoteOnly: boolean | null;
                    locationFilter: string | null;
                    emailAlerts: boolean;
                  } | null}
                  userId={authUser?.id ?? null}
                  size="sm"
                  defaultCriteria={defaultCriteria}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
