import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CompanyLogo } from "@/components/company-logo";
import { SiteNav } from "@/components/site-nav";

type Props = { params: Promise<{ userId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  if (!user) return {};
  const name = user.name ?? "Someone";
  return {
    title: `${name}'s watchlist — Crush`,
    description: `See which companies ${name} is tracking on Crush.`,
    // Personal page reached by shared link only — keep out of search indexes.
    robots: { index: false },
  };
}

export default async function PublicWatchlistPage({ params }: Props) {
  const { userId } = await params;

  const [user, tracked] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
    prisma.trackedCompany.findMany({
      where: { userId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            website: true,
            industry: true,
            fundingStage: true,
            jobs: {
              where: { status: "ACTIVE" },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!user) notFound();

  const name = user.name ?? "Someone";

  function formatFunding(stage: string | null): string | null {
    if (!stage) return null;
    const map: Record<string, string> = {
      seed: "Seed", series_a: "Series A", series_b: "Series B",
      series_c: "Series C", growth: "Growth", public: "Public",
    };
    return map[stage] ?? stage;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav user={null} />

      <main className="mx-auto max-w-6xl w-full px-6 py-12 flex-1">
        <div className="space-y-8">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Watchlist</p>
            <h1 className="font-heading text-3xl font-bold tracking-tight">{name}&apos;s companies</h1>
            <p className="text-sm text-muted-foreground">
              {tracked.length} {tracked.length === 1 ? "company" : "companies"} they actually want to work at
            </p>
          </div>

          {tracked.length === 0 ? (
            <p className="text-muted-foreground text-sm">No companies on this watchlist yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tracked.map(({ company }) => (
                <Link key={company.id} href={`/companies/${company.slug}`}>
                  <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-sm h-full">
                    <div className="flex items-center gap-3">
                      <CompanyLogo name={company.name} website={company.website} size="md" className="shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-snug truncate">{company.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {company.industry && (
                            <p className="text-xs text-muted-foreground truncate">{company.industry}</p>
                          )}
                          {formatFunding(company.fundingStage) && (
                            <p className="text-xs text-muted-foreground">{formatFunding(company.fundingStage)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {company.jobs.length > 0 && (
                      <p className="text-xs text-primary font-medium">
                        {company.jobs.length} open role{company.jobs.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-border/50">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-6 space-y-3 max-w-md">
              <p className="font-heading font-semibold">Track your own watchlist</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Follow the companies you actually want to work at. Get one alert the moment your exact role opens — no noise, no job boards.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-2"
              >
                Start on Crush — it&apos;s free →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
