import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CompanyLogo } from "@/components/company-logo";
import { FollowButton } from "@/components/follow-button";
import { TrackCollectionButton } from "@/components/track-collection-button";

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

  const [collection, tracked] = await Promise.all([
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
          select: { id: true, companyId: true },
        })
      : [],
  ]);

  if (!collection) notFound();

  const trackedMap = new Map(tracked.map((t) => [t.companyId, { id: t.id }]));
  const trackedIds = new Set(tracked.map((t) => t.companyId));
  const companies = collection.companies.map((cc) => cc.company);

  return (
    <div className="space-y-8">
      <Link
        href="/collections"
        className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <ArrowLeft className="size-3.5 transition-transform duration-[var(--dur-fast)] group-hover:-translate-x-0.5" />
        Collections
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-balance">{collection.name}</h1>
          {collection.description && (
            <p className="text-sm text-muted-foreground max-w-[62ch] leading-relaxed">
              {collection.description}
            </p>
          )}
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            {companies.length} {companies.length === 1 ? "company" : "companies"}
          </p>
        </div>

        <TrackCollectionButton
          companies={companies.map((c) => ({ id: c.id, name: c.name }))}
          trackedIds={trackedIds}
          userId={authUser?.id ?? null}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {collection.companies.map(({ company }) => {
          const tc = trackedMap.get(company.id) ?? null;
          return (
            <div
              key={company.id}
              className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-5 transition-[border-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-settle)] hover:border-border hover:shadow-sm hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-3">
                <CompanyLogo name={company.name} website={company.website} size="md" className="shrink-0" />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <Link
                    href={`/companies/${company.slug}`}
                    className="font-semibold text-sm leading-snug hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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
                  <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground tabular-nums">
                    <Users className="size-3" />
                    {company._count.trackedBy.toLocaleString()} following
                  </span>
                ) : (
                  <span />
                )}
                <FollowButton
                  company={{ id: company.id, name: company.name }}
                  tracked={tc}
                  userId={authUser?.id ?? null}
                  size="sm"
                  tone="quiet"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
