import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/components/job-card";
import type { AppStatus } from "@/components/status-picker";
import { PageView } from "@/components/page-analytics";
import { CompanyLogo } from "@/components/company-logo";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const [tracked, recentMatches, featuredCollections] = await Promise.all([
    prisma.trackedCompany.findMany({
      where: { userId: authUser.id },
      include: {
        company: true,
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
  ]);

  const showCollections = tracked.length < 5;

  return (
    <div className="space-y-8">
      <PageView event="dashboard_viewed" properties={{ tracked_count: tracked.length }} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tracked.length} {tracked.length === 1 ? "company" : "companies"} tracked
          </p>
        </div>
        <Link href="/companies">
          <Button size="sm">
            <Plus className="size-3.5" />
            Track a company
          </Button>
        </Link>
      </div>

      {tracked.length === 0 ? (
        // Full empty state
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="text-4xl">🎯</div>
            <p className="font-medium">No companies tracked yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Follow companies you want to work for and we'll alert you when a matching role opens.
            </p>
            <div className="flex gap-2 mt-2">
              <Link href="/collections">
                <Button size="sm" variant="default">
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
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Tracked companies</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {tracked.map((tc) => (
              <Link key={tc.id} href={`/companies/${tc.company.slug}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4 space-y-1.5">
                    <p className="text-sm font-semibold leading-snug">{tc.company.name}</p>
                    <div className="flex items-center gap-2">
                      {tc._count.matches > 0 && (
                        <Badge variant="default" className="text-xs">
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

      {/* Collections discovery — shown when tracking fewer than 5 companies */}
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
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm h-full">
                  {/* Mini logo stack */}
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

      {/* Recent matches */}
      {recentMatches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">Recent matches</h2>
            <Link href="/matches">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
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
    </div>
  );
}
