import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ArrowRight, CheckCircle2, Circle, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/components/job-card";
import type { AppStatus } from "@/components/status-picker";
import { PageView } from "@/components/page-analytics";
import { CompanyLogo } from "@/components/company-logo";
import { TrackedRoles } from "@/components/tracked-roles";
import { TrendingRoles } from "@/components/trending-roles";
import { RefreshMatchesButton } from "@/components/refresh-matches-button";
import { SuggestedRoles } from "@/components/suggested-roles";
import { ShareWatchlistButton } from "@/components/share-watchlist-button";
import { DiscoverySection } from "@/components/discovery-section";

type UserPrefs = {
  seniority?: string[];
  remoteOnly?: boolean | null;
  locationFilter?: string | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const [tracked, recentMatches, featuredCollections, trackedRoles, dbUser, totalMatches] = await Promise.all([
    prisma.trackedCompany.findMany({
      where: { userId: authUser.id },
      include: {
        company: {
          include: { _count: { select: { jobs: { where: { status: "ACTIVE" } } } } },
        },
        _count: { select: { matches: { where: { dismissed: false } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.match.findMany({
      where: { trackedCompany: { userId: authUser.id }, dismissed: false },
      include: { job: { include: { company: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.collection.findMany({
      take: 3,
      orderBy: { createdAt: "asc" },
      include: {
        companies: {
          include: { company: { select: { name: true, website: true } } },
          orderBy: { displayOrder: "asc" },
          take: 4,
        },
        _count: { select: { companies: true } },
      },
    }),
    prisma.trackedRole.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true },
    }),
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { defaultCriteria: true, currentTitle: true },
    }),
    prisma.match.count({ where: { trackedCompany: { userId: authUser.id } } }),
  ]);

  const prefs = dbUser?.defaultCriteria as UserPrefs | null;
  const showCollections = tracked.length < 5;
  const openRolesCount = tracked.reduce((sum, tc) => sum + (tc.company._count?.jobs ?? 0), 0);

  // If no matches from followed companies but user has tracked roles,
  // surface discovery jobs from the broader job board
  const trackedCompanyIds = tracked.map((tc) => tc.companyId);

  // Build location filter: respect remoteOnly + locationFilter prefs
  const locationWhere: Record<string, unknown>[] = [];
  if (prefs?.remoteOnly === true) {
    locationWhere.push({ remote: true });
  } else if (prefs?.remoteOnly === false) {
    locationWhere.push({ remote: false });
  }
  if (prefs?.locationFilter) {
    const loc = prefs.locationFilter;
    locationWhere.push({
      OR: [
        { remote: true, location: null },          // remote with no location = anywhere
        { location: { contains: loc, mode: "insensitive" as const } },
      ],
    });
  }


  return (
    <div className="space-y-8">
      <PageView event="dashboard_viewed" properties={{ tracked_count: tracked.length }} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          {tracked.length > 0 && <ShareWatchlistButton userId={authUser.id} />}
        </div>
      </div>

      {/* Stats strip */}
      {tracked.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Companies watched", value: tracked.length },
            { label: "Open roles", value: openRolesCount.toLocaleString() },
            { label: "Total matches", value: totalMatches.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border/60 bg-card px-4 py-3">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Setup checklist — shown until user has both roles and companies */}
      {(trackedRoles.length === 0 || tracked.length === 0) && (
        <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
          <p className="text-sm font-semibold">Get started</p>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="size-4 text-green-500 shrink-0" />
              <span className="text-muted-foreground line-through">Create your account</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {trackedRoles.length > 0
                ? <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                : <Circle className="size-4 text-muted-foreground/50 shrink-0" />
              }
              <span className={trackedRoles.length > 0 ? "text-muted-foreground line-through" : "font-medium"}>
                Add your target roles
              </span>
              {trackedRoles.length === 0 && (
                <Link href="/settings" className="ml-auto text-xs text-primary underline underline-offset-2 shrink-0">
                  Go to Settings →
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              {tracked.length > 0
                ? <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                : <Circle className="size-4 text-muted-foreground/50 shrink-0" />
              }
              <span className={tracked.length > 0 ? "text-muted-foreground line-through" : "font-medium"}>
                Follow companies you want to work for
              </span>
              {tracked.length === 0 && (
                <Link href="/companies" className="ml-auto text-xs text-primary underline underline-offset-2 shrink-0">
                  Browse companies →
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Circle className="size-4 text-muted-foreground/50 shrink-0" />
              <span className="text-muted-foreground">Get matched when roles open</span>
            </div>
          </div>
        </div>
      )}

      {/* My Roles */}
      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight">My roles</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Role titles matched against every company you track. Generic (&ldquo;engineer&rdquo;) or specific (&ldquo;GTM engineer&rdquo;) — both work.
          </p>
        </div>
        <TrackedRoles
          initialRoles={trackedRoles}
          trackedCount={tracked.length}
          initialSeniority={prefs?.seniority ?? []}
          initialRemoteOnly={prefs?.remoteOnly ?? null}
          initialLocationFilter={prefs?.locationFilter ?? null}
          showFilters={false}
        />

        {trackedRoles.length === 0 && dbUser?.currentTitle && (
          <SuggestedRoles currentTitle={dbUser.currentTitle} />
        )}

        <TrendingRoles
          trackedTitles={trackedRoles.map((r) => r.title)}
        />
      </section>

      {/* Recent matches — shown above watchlist; matches matter most */}
      {recentMatches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-bold tracking-tight">Recent matches</h2>
            <div className="flex items-center gap-3">
              <RefreshMatchesButton />
              <Link href="/matches">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            {recentMatches.map((match) => (
              <JobCard
                key={match.id}
                job={match.job}
                matchId={match.id}
                applicationStatus={match.applicationStatus as AppStatus}
              />
            ))}
          </div>
        </section>
      )}

      {tracked.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Building2 className="size-8 text-muted-foreground/30" />
            <div className="space-y-1">
              <p className="font-semibold">Add your first company</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Pick companies you&apos;d actually leave for. We&apos;ll watch their job pages daily and alert you the moment your role opens.
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <Link href="/collections">
                <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90">
                  Browse collections
                </Button>
              </Link>
              <Link href="/companies">
                <Button size="sm" variant="outline">
                  All companies
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-bold tracking-tight">Watchlist</h2>
            <Link href="/companies">
              <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 rounded-lg">
                <Plus className="size-3.5" />
                Add company
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {tracked.map((tc) => (
              <Link key={tc.id} href={`/companies/${tc.company.slug}`}>
                <Card className="border-border/60 hover:border-border hover:shadow-sm transition-all duration-150 cursor-pointer h-full">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <CompanyLogo
                        name={tc.company.name}
                        website={tc.company.website}
                        size="sm"
                        className="shrink-0"
                      />
                      <p className="text-sm font-semibold leading-snug truncate">{tc.company.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {tc._count.matches > 0 && (
                        <Badge className="text-xs bg-amber text-amber-foreground border-transparent">
                          {tc._count.matches} new
                        </Badge>
                      )}
                      {tc.company.industry && (
                        <span className="text-xs text-muted-foreground truncate">
                          {tc.company.industry}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Collections discovery */}
      {showCollections && featuredCollections.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Discover collections</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Curated company lists — track a whole theme in one click
              </p>
            </div>
            <Link href="/collections">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                See all <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {featuredCollections.map((col) => (
              <Link key={col.id} href={`/collections/${col.slug}`} className="group">
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all duration-150 hover:border-foreground/20 hover:shadow-sm h-full">
                  <div className="flex -space-x-1.5">
                    {col.companies.map(({ company }, i) => (
                      <div
                        key={i}
                        className="ring-2 ring-background rounded-lg"
                        style={{ zIndex: col.companies.length - i }}
                      >
                        <CompanyLogo name={company.name} website={company.website} size="sm" />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                      {col.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {col._count.companies} companies
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Discovery: role-matching jobs outside followed companies */}
      {trackedRoles.length > 0 && <DiscoverySection />}
    </div>
  );
}
