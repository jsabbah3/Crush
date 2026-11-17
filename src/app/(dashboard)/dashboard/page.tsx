import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PageView } from "@/components/page-analytics";
import { CompanyLogo } from "@/components/company-logo";
import { RefreshMatchesButton } from "@/components/refresh-matches-button";
import { SuggestedRoles } from "@/components/suggested-roles";
import { TrackedRoles } from "@/components/tracked-roles";
import { StatusPicker, type AppStatus } from "@/components/status-picker";
import { CompanyGroups } from "@/components/company-groups";
import { getAlsoOpen } from "@/lib/also-open";
import { WatchBrief } from "@/components/watch-brief";
import { EmptyState, PageHeader, Rank } from "@/components/brand";
import { agoShort, getOutlook, OUTLOOK_DAYS } from "@/lib/outlook";
import { cn } from "@/lib/utils";
import { roleKey } from "@/lib/role-key";
import { ApplicationStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Today — Crush" };

type UserPrefs = {
  seniority?: string[];
  remoteOnly?: boolean | null;
  locationFilter?: string | null;
};

const APPLIED_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.INTERVIEWING,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
];

const TZ = "America/New_York";

function todayLine(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: TZ });
}

/** When the boards were last read, in words: "this morning", "yesterday", "Nov 14". */
function checkedLabel(capturedOn: Date | null | undefined): string | null {
  if (!capturedOn) return null;
  const day = capturedOn.toISOString().slice(0, 10);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA", { timeZone: TZ });
  if (day === today) return "this morning";
  if (day === yesterday) return "yesterday";
  return capturedOn.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

const jobSelect = {
  id: true, title: true, type: true, location: true, remote: true,
  salaryMin: true, salaryMax: true, currency: true, url: true,
  postedAt: true, companyId: true,
  company: { select: { name: true, slug: true, website: true } },
} as const;

/**
 * Today: the inbox. What opened at the companies on your list, and nothing
 * else — setup lives in onboarding, the list lives on /list.
 */
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; view?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { tab, view } = await searchParams;
  const showAlso = tab === "also";
  // ?tab=applied is the old link (weekly email); it means Matches → Applied.
  const showApplied = !showAlso && (view === "applied" || tab === "applied");
  const showOpen = !showAlso && !showApplied;

  const [tracked, trackedRoles, dbUser] = await Promise.all([
    prisma.trackedCompany.findMany({
      where: { userId: authUser.id },
      select: { id: true, companyId: true },
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
  ]);

  const raw = (dbUser?.defaultCriteria ?? {}) as UserPrefs;
  const prefs = {
    seniority: raw.seniority ?? [],
    remoteOnly: raw.remoteOnly ?? null,
    locationFilter: raw.locationFilter ?? null,
  };

  // ── Not set up yet: one job on this page — finish setup. ────────────────
  if (trackedRoles.length === 0 || tracked.length === 0) {
    return (
      <div className="space-y-8">
        <PageView event="dashboard_viewed" properties={{ tracked_count: tracked.length, state: "setup" }} />
        <PageHeader eyebrow={todayLine()} title="Two things, then we start watching.">
          Crush only emails when a role you want opens at a company you named. It needs both.
        </PageHeader>

        <ol className="border-t-[3px] border-foreground">
          <li className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-b border-foreground/15 py-6">
            <Rank n={1} className={cn("text-3xl", trackedRoles.length > 0 ? "text-muted-foreground" : "text-primary")} />
            <div className="space-y-3">
              <h2 className="font-heading text-2xl font-bold tracking-[-0.02em]">
                {trackedRoles.length > 0 ? "Your role — done" : "The role you want"}
              </h2>
              <p className="text-sm text-muted-foreground">
                A title or two. Broad (&ldquo;account executive&rdquo;) or narrow (&ldquo;enterprise AE&rdquo;) both work.
              </p>
              <TrackedRoles
                initialRoles={trackedRoles}
                trackedCount={tracked.length}
                initialSeniority={prefs.seniority}
                initialRemoteOnly={prefs.remoteOnly}
                initialLocationFilter={prefs.locationFilter}
                showFilters={false}
              />
              {trackedRoles.length === 0 && dbUser?.currentTitle && <SuggestedRoles currentTitle={dbUser.currentTitle} />}
            </div>
          </li>
          <li className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-b border-foreground/15 py-6">
            <Rank n={2} className={cn("text-3xl", tracked.length > 0 ? "text-muted-foreground" : "text-primary")} />
            <div className="space-y-3">
              <h2 className="font-heading text-2xl font-bold tracking-[-0.02em]">
                {tracked.length > 0
                  ? `Your list — ${tracked.length} ${tracked.length === 1 ? "company" : "companies"}`
                  : "The companies you'd leave for"}
              </h2>
              <p className="text-sm text-muted-foreground">Name them, or start from a ready-made list.</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/companies">
                  <Button variant={tracked.length > 0 ? "outline" : "default"}>
                    {tracked.length > 0 ? "Edit your list" : "Build your list"}
                  </Button>
                </Link>
                <Link href="/collections">
                  <Button variant="outline">Borrow a list</Button>
                </Link>
              </div>
            </div>
          </li>
        </ol>
      </div>
    );
  }

  const trackedIds = tracked.map((t) => t.id);
  const companyIds = tracked.map((t) => t.companyId);

  const [inbox, appliedCount, applied, lastSnapshot, connectionCount] = await Promise.all([
    prisma.match.findMany({
      where: { trackedCompanyId: { in: trackedIds }, dismissed: false, applicationStatus: ApplicationStatus.INTERESTED },
      select: { id: true, createdAt: true, seenAt: true, applicationStatus: true, job: { select: jobSelect } },
      orderBy: { createdAt: "desc" },
      take: 400,
    }),
    prisma.match.count({
      where: { trackedCompanyId: { in: trackedIds }, applicationStatus: { in: APPLIED_STATUSES } },
    }),
    showApplied
      ? prisma.match.findMany({
          where: { trackedCompanyId: { in: trackedIds }, applicationStatus: { in: APPLIED_STATUSES } },
          select: {
            id: true, applicationStatus: true, applicationNote: true, appliedAt: true,
            job: { select: jobSelect },
          },
          orderBy: [{ appliedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
    prisma.companyRoleSnapshot.aggregate({
      where: { companyId: { in: companyIds } },
      _max: { capturedOn: true },
    }),
    prisma.linkedInConnection.count({ where: { userId: authUser.id } }),
  ]);

  // Count roles, not postings: one role posted for three cities is one card.
  const roles = new Map<string, boolean>();
  for (const m of inbox) {
    const k = roleKey(m.job.companyId, m.job.title);
    roles.set(k, (roles.get(k) ?? false) || m.seenAt === null);
  }
  const inboxRoles = roles.size;
  const unseen = [...roles.values()].filter(Boolean).length;
  const anyUnseen = inbox.some((m) => m.seenAt === null);

  // Mark the inbox seen — after the read above, so this visit still shows
  // which ones are new.
  if (showOpen && anyUnseen) {
    await prisma.match.updateMany({
      where: { trackedCompanyId: { in: trackedIds }, seenAt: null },
      data: { seenAt: new Date() },
    });
  }

  // Who you know at each inbox company (first-degree LinkedIn connections).
  const inboxCompanyIds = [...new Set(inbox.map((m) => m.job.companyId))];
  const groups = inboxCompanyIds.length > 0 && connectionCount > 0
    ? await prisma.linkedInConnection.groupBy({
        by: ["companyId"],
        where: { userId: authUser.id, companyId: { in: inboxCompanyIds } },
        _count: { _all: true },
      })
    : [];
  const networkByCompanyId: Record<string, number> = {};
  for (const g of groups) if (g.companyId) networkByCompanyId[g.companyId] = g._count._all;

  // Quiet inbox: show which companies are likeliest to open something next.
  let likely: { name: string; slug: string; website: string | null; matched: number; lastAt: Date | null }[] = [];
  if (showOpen && inbox.length === 0) {
    const outlook = await getOutlook(companyIds, trackedRoles.map((r) => r.title), raw);
    const top = [...outlook.entries()].sort((a, b) => b[1].matched - a[1].matched).slice(0, 5);
    const companies = await prisma.company.findMany({
      where: { id: { in: top.map(([id]) => id) } },
      select: { id: true, name: true, slug: true, website: true },
    });
    const byId = new Map(companies.map((c) => [c.id, c]));
    likely = top.flatMap(([id, o]) => {
      const c = byId.get(id);
      return c ? [{ ...c, matched: o.matched, lastAt: o.lastAt }] : [];
    });
  }

  const also = showAlso ? await getAlsoOpen(companyIds, trackedRoles.map((r) => r.title), raw) : [];

  const title = showAlso
    ? "Also open, elsewhere."
    : showApplied
    ? "Where you've applied."
    : unseen === 1
      ? "Something opened."
      : unseen > 1
        ? `${unseen} roles opened.`
        : inbox.length > 0
          ? "Nothing new since last time."
          : "Nothing new today.";

  return (
    <div className="space-y-6">
      <PageView event="dashboard_viewed" properties={{ tracked_count: tracked.length, inbox: inboxRoles, unseen }} />
      <PageHeader eyebrow={todayLine()} title={title} action={<RefreshMatchesButton />} />

      <WatchBrief
        roles={trackedRoles}
        prefs={prefs}
        companyCount={tracked.length}
        checked={checkedLabel(lastSnapshot._max.capturedOn)}
      />

      {/* Tabs */}
      <nav className="flex gap-6 border-b border-foreground/15" aria-label="Today">
        {[
          { href: "/dashboard", label: "Matches", count: inboxRoles as number | null, active: !showAlso },
          { href: "/dashboard?tab=also", label: "Also open", count: null, active: showAlso },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={cn(
              "-mb-px flex items-baseline gap-2 border-b-[3px] pb-2 text-sm font-semibold",
              t.active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.count !== null && <span className="font-mono text-xs font-normal text-muted-foreground">{t.count}</span>}
          </Link>
        ))}
      </nav>

      {/* Matches: open vs applied */}
      {!showAlso && (
        <div className="flex gap-2 text-xs font-semibold">
          {[
            { href: "/dashboard", label: `Open · ${inboxRoles}`, active: showOpen },
            { href: "/dashboard?view=applied", label: `Applied · ${appliedCount}`, active: showApplied },
          ].map((f) => (
            <Link
              key={f.href}
              href={f.href}
              aria-current={f.active ? "page" : undefined}
              className={cn(
                "border px-2.5 py-1",
                f.active ? "border-foreground bg-foreground text-background" : "border-foreground/25 text-muted-foreground hover:border-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
      )}

      {showAlso ? (
        also.length === 0 ? (
          <EmptyState kicker="Nothing else open" title="No roles like yours outside your list right now.">
            We look at every company we track for open roles that fit what you asked for. Check back after the next
            morning&apos;s check, or broaden your roles above.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Roles that fit what you asked for, open now at companies that aren&apos;t on your list — companies like
              yours first. Add one and it&apos;s watched from tomorrow.
            </p>
            <CompanyGroups mode="also" userId={authUser.id} items={also.map((a) => ({ job: a.job, at: a.at }))} />
          </div>
        )
      ) : showApplied ? (
        applied.length === 0 ? (
          <EmptyState kicker="Nothing applied yet" title="Your applications will collect here.">
            When you mark a match as Applied, it moves out of your inbox and into this list, where you can track it
            through to an offer.
          </EmptyState>
        ) : (
          <ol className="border-t border-foreground">
            {applied.map((app) => (
              <li key={app.id} className="flex items-center gap-4 border-b border-foreground/15 px-1 py-3.5">
                <CompanyLogo name={app.job.company.name} website={app.job.company.website} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-base font-semibold leading-snug">{app.job.title}</p>
                  <Link href={`/companies/${app.job.company.slug}`} className="text-xs text-muted-foreground hover:text-primary">
                    {app.job.company.name}
                  </Link>
                  {app.applicationNote && (
                    <p className="mt-0.5 truncate text-xs italic text-muted-foreground/70">{app.applicationNote}</p>
                  )}
                </div>
                <span className="hidden w-16 shrink-0 text-right font-mono text-xs text-muted-foreground sm:block">
                  {app.appliedAt
                    ? app.appliedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "—"}
                </span>
                <div className="flex w-36 shrink-0 justify-end">
                  <StatusPicker matchId={app.id} initialStatus={app.applicationStatus as AppStatus} />
                </div>
                {app.job.url && (
                  <a
                    href={app.job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    title="Open the posting"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </li>
            ))}
          </ol>
        )
      ) : inbox.length === 0 ? (
        <div className="space-y-8">
          <EmptyState kicker="Inbox clear" title="Nothing has opened yet. That's normal.">
            Most companies post a role like yours every few weeks, not every day. We check every morning; when one
            fits, it lands here and in your email.
          </EmptyState>
          {likely.length > 0 && (
            <section className="space-y-3">
              <h2 className="label-caps text-graphite">Likeliest to open something next</h2>
              <ol className="border-t border-foreground">
                {likely.map((c, i) => (
                  <li key={c.slug} className="border-b border-foreground/15">
                    <Link href={`/companies/${c.slug}`} className="group flex items-baseline gap-3 px-1 py-3">
                      <Rank n={i + 1} className="w-7 shrink-0 text-lg text-muted-foreground" />
                      <CompanyLogo name={c.name} website={c.website} size="sm" className="size-6 translate-y-1" />
                      <span className="truncate font-heading text-lg font-semibold group-hover:text-primary">{c.name}</span>
                      <span className="leader" />
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {c.matched} like yours in {OUTLOOK_DAYS}d{c.lastAt ? ` · last ${agoShort(c.lastAt)}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      ) : (
        <>
          <CompanyGroups
            mode="matches"
            userId={authUser.id}
            networkByCompanyId={networkByCompanyId}
            items={inbox.map((m) => ({
              job: m.job,
              at: m.createdAt,
              match: { id: m.id, applicationStatus: m.applicationStatus, seenAt: m.seenAt },
            }))}
          />
          {connectionCount === 0 && (
            <p className="flex items-start gap-3 border-l-[3px] border-foreground bg-wash/60 px-4 py-3 text-sm leading-relaxed">
              <Users className="mt-0.5 size-4 shrink-0 text-graphite" />
              <span>
                You may already know someone at these companies. Import your LinkedIn connections and each match shows
                who could refer you.{" "}
                <Link href="/settings" className="font-semibold underline decoration-primary decoration-2 underline-offset-2 hover:text-primary">
                  Import connections
                </Link>
              </span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
