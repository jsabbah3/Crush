import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
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

function formatFunding(stage: string | null): string | null {
  if (!stage) return null;
  const map: Record<string, string> = {
    seed: "Seed", series_a: "Series A", series_b: "Series B",
    series_c: "Series C", growth: "Growth", public: "Public",
  };
  return map[stage] ?? stage;
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
  const companies = tracked.map((t) => t.company);
  const openRoles = companies.reduce((sum, c) => sum + c.jobs.length, 0);
  const industries = Array.from(
    new Set(companies.map((c) => c.industry).filter(Boolean) as string[]),
  );

  const stats: { value: string; label: string }[] = [
    { value: String(companies.length), label: companies.length === 1 ? "company" : "companies" },
    { value: openRoles.toLocaleString(), label: openRoles === 1 ? "open role" : "open roles" },
    { value: String(industries.length), label: industries.length === 1 ? "industry" : "industries" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav user={null} />

      <main className="mx-auto max-w-5xl w-full px-6 py-12 sm:py-16 flex-1">
        {companies.length === 0 ? (
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Crush watchlist</p>
            <h1 className="font-heading text-3xl font-bold tracking-tight">{name}&apos;s companies</h1>
            <p className="text-sm text-muted-foreground">No companies on this watchlist yet.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Masthead */}
            <header className="space-y-6">
              {/* Logo signature ribbon */}
              <div className="flex -space-x-2">
                {companies.slice(0, 8).map((c, i) => (
                  <div
                    key={c.id}
                    className="ring-2 ring-background rounded-xl"
                    style={{ zIndex: 8 - i }}
                  >
                    <CompanyLogo name={c.name} website={c.website} size="sm" />
                  </div>
                ))}
                {companies.length > 8 && (
                  <div
                    className="ring-2 ring-background size-8 rounded-xl bg-muted flex items-center justify-center font-mono text-[11px] font-medium text-muted-foreground tabular-nums"
                    style={{ zIndex: 0 }}
                  >
                    +{companies.length - 8}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Crush watchlist
                </p>
                <h1 className="font-heading text-4xl font-bold tracking-tight text-balance leading-[1.05]">
                  The companies {name}&apos;d{" "}
                  <span className="text-primary italic">actually leave for.</span>
                </h1>
              </div>

              {/* Stat line */}
              <dl className="flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-5">
                {stats.map((s) => (
                  <div key={s.label} className="space-y-0.5">
                    <dd className="font-heading text-2xl font-bold tracking-tight tabular-nums">{s.value}</dd>
                    <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</dt>
                  </div>
                ))}
              </dl>
            </header>

            {/* Company grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((company) => (
                <Link
                  key={company.id}
                  href={`/companies/${company.slug}`}
                  className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <div className="flex h-full flex-col gap-3 rounded-xl border border-border/60 bg-card p-5 transition-[border-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-settle)] hover:border-border hover:shadow-sm hover:-translate-y-0.5">
                    <div className="flex items-center gap-3">
                      <CompanyLogo name={company.name} website={company.website} size="md" className="shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-[15px] leading-snug truncate transition-colors group-hover:text-primary">
                          {company.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                          {company.industry && <span className="truncate">{company.industry}</span>}
                          {company.industry && formatFunding(company.fundingStage) && (
                            <span className="text-border">·</span>
                          )}
                          {formatFunding(company.fundingStage) && (
                            <span className="shrink-0">{formatFunding(company.fundingStage)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {company.jobs.length > 0 && (
                      <p className="mt-auto font-mono text-xs font-medium text-primary tabular-nums">
                        {company.jobs.length} open role{company.jobs.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Closing CTA band */}
            <div className="rounded-2xl border border-border bg-ink-band text-ink-band-foreground p-8 sm:p-10">
              <div className="max-w-lg space-y-3">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-balance">
                  Build your own watchlist
                </h2>
                <p className="text-sm leading-relaxed text-ink-band-foreground/70">
                  Follow the companies you&apos;d actually leave for. Crush sends one alert the moment your exact role opens — no noise, no job boards.
                </p>
                <Link
                  href="/"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  Start on Crush — it&apos;s free
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
