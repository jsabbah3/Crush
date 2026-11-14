import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ArrowRight, CheckCircle2, Circle, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/job-card";
import type { AppStatus } from "@/components/status-picker";
import { PageView } from "@/components/page-analytics";
import { CompanyLogo } from "@/components/company-logo";
import { CompanySearch } from "@/components/company-search";
import { TrackedRoles } from "@/components/tracked-roles";
import { RefreshMatchesButton } from "@/components/refresh-matches-button";
import { SuggestedRoles } from "@/components/suggested-roles";
import { ShareWatchlistButton } from "@/components/share-watchlist-button";
import { DiscoverySection } from "@/components/discovery-section";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PageHeader, Rubber, Seal } from "@/components/brand";
import { boardStatus } from "@/lib/board-status";
import { agoShort, getOutlook, OUTLOOK_DAYS } from "@/lib/outlook";

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

  const unseenMatches = await prisma.match.count({
    where: { trackedCompany: { userId: authUser.id }, dismissed: false, seenAt: null },
  });

  // First-degree LinkedIn connections at the recent-match companies,
  // so each match card can show "who you know here".
  const recentMatchCompanyIds = [...new Set(recentMatches.map((m) => m.job.companyId))];
  const connectionGroups = recentMatchCompanyIds.length > 0
    ? await prisma.linkedInConnection.groupBy({
        by: ["companyId"],
        where: { userId: authUser.id, companyId: { in: recentMatchCompanyIds } },
        _count: { _all: true },
      })
    : [];
  const networkByCompanyId = new Map(
    connectionGroups.map((g) => [g.companyId, g._count._all]),
  );

  const prefs = dbUser?.defaultCriteria as UserPrefs | null;
  const showCollections = tracked.length < 5;
  const openRolesCount = tracked.reduce((sum, tc) => sum + (tc.company._count?.jobs ?? 0), 0);

  const trackedCompanyIds = tracked.map((tc) => tc.companyId);

  // Per-company history: how many roles like this user's each one has posted
  // lately. Turns "nothing yet" into something you can plan around.
  const outlook = await getOutlook(trackedCompanyIds, trackedRoles.map((r) => r.title), prefs);
  // "Can't see" means no readable board AND nothing on file — a company whose
  // roles reach us some other way is visible, whatever its source says.
  const canSee = (tc: (typeof tracked)[number]) =>
    boardStatus(tc.company).connected || (tc.company._count?.jobs ?? 0) > 0;
  const unconnected = tracked.filter((tc) => !canSee(tc)).length;

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
    <div className="space-y-10">
      <PageView event="dashboard_viewed" properties={{ tracked_count: tracked.length }} />
      <PageHeader
        eyebrow="Your desk"
        title={
          unseenMatches > 0
            ? "You've got mail."
            : tracked.length > 0
              ? "No letters today."
              : "Let's start your list."
        }
        action={tracked.length > 0 ? <ShareWatchlistButton userId={authUser.id} /> : undefined}
      >
        {unseenMatches > 0 ? (
          <>
            <span className="font-semibold text-foreground">
              {unseenMatches} new {unseenMatches === 1 ? "match" : "matches"}
            </span>{" "}
            since your last visit.
          </>
        ) : tracked.length > 0 ? (
          <>
            We&apos;re watching {tracked.length} {tracked.length === 1 ? "company" : "companies"} for you and read
            their boards every morning. The day a role fits, it shows up here and in your inbox.
          </>
        ) : (
          <>Name the companies you&apos;d actually leave for. We&apos;ll take it from there.</>
        )}
      </PageHeader>

      {/* Stats strip — matches gets top billing, it's the reason this tool exists */}
      {tracked.length > 0 && (
        <div className="grid grid-cols-2 gap-3 stagger-children sm:grid-cols-[1.4fr_1fr_1fr]">
          <Link
            href="/matches"
            className="animate-rise airmail-frame group col-span-2 rounded-[4px] sm:col-span-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-full items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-heading text-5xl font-black leading-none tracking-[-0.03em] text-primary">
                  {totalMatches.toLocaleString()}
                </p>
                <p className="label-caps mt-2 text-foreground/70">
                  {totalMatches === 1 ? "Match so far" : "Matches so far"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {unseenMatches > 0 ? (
                  <Rubber tone="red" tilt={-5}>{unseenMatches} new</Rubber>
                ) : (
                  <Mail className="size-6 text-foreground/25" />
                )}
                <span className="flex items-center gap-1 text-xs font-semibold group-hover:text-primary">
                  Open the mail <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>
          {[
            { label: "On your list", value: tracked.length.toLocaleString() },
            { label: "Open roles across them", value: openRolesCount.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="animate-rise flex flex-col justify-center rounded-[4px] border bg-card px-4 py-3">
              <p className="font-heading text-3xl font-black leading-none tracking-[-0.03em]">{value}</p>
              <p className="label-caps mt-2 text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Setup checklist — shown until user has both roles and companies */}
      {(trackedRoles.length === 0 || tracked.length === 0) && (
        <div className="sheet rounded-[4px] p-5 space-y-3">
          <p className="font-heading text-lg font-bold tracking-[-0.01em]">Three things and you&apos;re done</p>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="size-4 text-moss shrink-0" />
              <span className="text-muted-foreground line-through">Create your account</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {trackedRoles.length > 0
                ? <CheckCircle2 className="size-4 text-moss shrink-0" />
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
                ? <CheckCircle2 className="size-4 text-moss shrink-0" />
                : <Circle className="size-4 text-muted-foreground/50 shrink-0" />
              }
              <span className={tracked.length > 0 ? "text-muted-foreground line-through" : "font-medium"}>
                Name the companies you&apos;d leave for
              </span>
              {tracked.length === 0 && (
                <Link href="/companies" className="ml-auto text-xs text-primary underline underline-offset-2 shrink-0">
                  Browse companies →
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Circle className="size-4 text-muted-foreground/50 shrink-0" />
              <span className="text-muted-foreground">Get a letter the day your role opens</span>
            </div>
          </div>
        </div>
      )}

      {/* My Roles — collapsed by default once the user has roles set */}
      <CollapsibleSection
        title="My roles"
        storageKey="my-roles"
        defaultOpen={trackedRoles.length === 0}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Role titles matched against every company you track. Generic (&ldquo;engineer&rdquo;) or specific (&ldquo;GTM engineer&rdquo;) — both work.
          </p>
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
        </div>
      </CollapsibleSection>

      {/* Add companies — collapsed once you have some, open to invite the action for new users */}
      <CollapsibleSection
        title="Add companies"
        storageKey="add-companies"
        defaultOpen={tracked.length === 0}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Search for a company to start watching it. We&apos;ll check for a job board automatically.
          </p>
          <CompanySearch
            trackedCompanyIds={trackedCompanyIds}
          />
        </div>
      </CollapsibleSection>

      {/* Your list — every company with what we can actually see there */}
      {tracked.length === 0 ? (
        <div className="airmail-frame rounded-[4px]">
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <Seal className="size-12" />
            <div className="space-y-1.5">
              <p className="font-heading text-2xl font-extrabold tracking-[-0.02em]">Who&apos;s first?</p>
              <p className="mx-auto max-w-sm leading-relaxed text-muted-foreground">
                Pick the companies you&apos;d actually leave for. We read their job boards every morning and write the day your role opens.
              </p>
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Link href="/companies?view=browse">
                <Button>Browse companies</Button>
              </Link>
              <Link href="/collections">
                <Button variant="outline">Start from a collection</Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <CollapsibleSection
          title="Your list"
          storageKey="watchlist"
          defaultOpen={recentMatches.length === 0}
          action={
            <Link href="/companies">
              <Button variant="ink" size="sm">
                <Plus className="size-3.5" />
                Add company
              </Button>
            </Link>
          }
        >
          <div className="space-y-3">
            {unconnected > 0 && (
              <p className="rounded-[4px] border border-dashed border-kraft bg-kraft-soft/60 px-4 py-3 text-sm leading-relaxed">
                <span className="font-semibold">
                  We can&apos;t see the job board for {unconnected} of your {tracked.length}{" "}
                  {tracked.length === 1 ? "company" : "companies"} yet.
                </span>{" "}
                <span className="text-muted-foreground">
                  No letters can come from those until we connect them — we keep re-checking, and they&apos;re marked below.
                </span>
              </p>
            )}
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tracked.map((tc) => {
                const visible = canSee(tc);
                const look = outlook.get(tc.companyId);
                const open = tc.company._count?.jobs ?? 0;
                return (
                  <li key={tc.id}>
                    <Link
                      href={`/companies/${tc.company.slug}`}
                      className="group flex h-full gap-3 rounded-[4px] border bg-card p-3.5 transition-[border-color,transform] duration-200 ease-[var(--ease-settle)] hover:-translate-y-0.5 hover:border-foreground/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <CompanyLogo name={tc.company.name} website={tc.company.website} size="md" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-heading text-base font-bold leading-snug tracking-[-0.01em] group-hover:text-primary">
                            {tc.company.name}
                          </p>
                          {tc._count.matches > 0 && (
                            <span className="shrink-0 rounded-[2px] bg-note px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-note-foreground">
                              {tc._count.matches} {tc._count.matches === 1 ? "match" : "matches"}
                            </span>
                          )}
                        </div>
                        {visible ? (
                          <>
                            <p className="font-mono text-xs tabular-nums text-muted-foreground">
                              <span className="font-semibold text-foreground">{open.toLocaleString()}</span> open now
                            </p>
                            {trackedRoles.length > 0 && (look || tc._count.matches === 0) && (
                              <p className="text-xs leading-snug text-muted-foreground">
                                {look ? (
                                  <>
                                    <span className="font-semibold text-moss">
                                      {look.matched} like yours
                                    </span>{" "}
                                    in {OUTLOOK_DAYS} days{look.lastAt ? `, last ${agoShort(look.lastAt)}` : ""}
                                  </>
                                ) : (
                                  <>None like yours in {OUTLOOK_DAYS} days</>
                                )}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="label-caps pt-1 text-clay">Board not connected</p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </CollapsibleSection>
      )}

      {/* Recent matches — open by default; matches matter most */}
      {recentMatches.length > 0 && (
        <CollapsibleSection
          title="Recent matches"
          storageKey="recent-matches"
          action={
            <div className="flex items-center gap-3">
              <RefreshMatchesButton />
              <Link href="/matches">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>
          }
        >
          <div className="space-y-3">
            {recentMatches.map((match) => (
              <JobCard
                key={match.id}
                job={match.job}
                matchId={match.id}
                applicationStatus={match.applicationStatus as AppStatus}
                networkCount={networkByCompanyId.get(match.job.companyId)}
                isNew={match.seenAt === null}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Collections discovery */}
      {showCollections && featuredCollections.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold tracking-[-0.01em]">Borrow a list</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Hand-picked bundles — follow a whole one in a click
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
                <div className="flex h-full flex-col gap-3 rounded-[4px] border bg-card p-4 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/35">
                  <div className="flex gap-1.5">
                    {col.companies.map(({ company }, i) => (
                      <CompanyLogo key={i} name={company.name} website={company.website} size="sm" />
                    ))}
                  </div>
                  <div className="flex-1">
                    <p className="font-heading text-base font-bold leading-snug tracking-[-0.01em] group-hover:text-primary transition-colors">
                      {col.name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">
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
