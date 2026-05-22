import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/components/job-card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const [tracked, recentMatches] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Building2 className="size-10 text-muted-foreground/40" />
            <p className="font-medium">No companies tracked yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Follow companies you want to work for and we'll alert you when a matching role opens.
            </p>
            <Link href="/companies">
              <Button size="sm" className="mt-2">
                Browse companies
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Tracked companies</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {tracked.map((tc) => (
                <Link key={tc.id} href={`/companies/${tc.company.slug}`}>
                  <Card className="hover:shadow-sm transition-shadow cursor-pointer h-full">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-sm">{tc.company.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                  <JobCard key={match.id} job={match.job} matchId={match.id} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
