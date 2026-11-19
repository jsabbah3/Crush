import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { relevantCompanyWhere } from "@/lib/company-relevance";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/company-logo";
import { SiteNav } from "@/components/site-nav";
import { HotList } from "@/components/hot-list";
import { ListBuilder, type Pick } from "@/components/list-builder";
import { Rank, Rule, Tag, Wordmark } from "@/components/brand";
import { signInWithGoogle } from "@/app/actions/auth";
import { getFreshness } from "@/lib/freshness";
import { agoShort } from "@/lib/outlook";
import { listedCollections } from "@/lib/collections";

const STEPS = [
  {
    n: "1",
    title: "Name your crushes.",
    body: "The handful of companies you'd genuinely leave for. Ten is plenty. If one isn't in our files, add it by name and we go find its job board.",
  },
  {
    n: "2",
    title: "Say exactly what you want.",
    body: "Your titles, your level, where you'll work. We read every new posting against that — not against a cloud of keywords.",
  },
  {
    n: "3",
    title: "Get one email.",
    body: "We check each company's own job board early every morning. If your role went up, the email is waiting when you wake.",
  },
];

// What an inbox full of job-board email actually says.
const JUNK = [
  { from: "JobBoard", text: "127 new jobs for you!" },
  { from: "Careers Digest", text: "Are you still looking?" },
  { from: "JobBoard", text: "Jobs you may be interested in" },
  { from: "Network", text: "A recruiter viewed your profile" },
  { from: "Job Alerts", text: "Top picks this week (43)" },
  { from: "JobBoard", text: "Apply now — 2,000+ applicants" },
];

const FAQ = [
  {
    q: "How is this different from LinkedIn alerts?",
    a: "LinkedIn alerts on keywords, across every company that pays to post. Crush watches only the companies you named, reads their own job boards directly, and writes only when the role fits what you told us.",
  },
  {
    q: "How fast will I hear?",
    a: "Boards are checked early every morning, and alerts go out right after. A role posted today is in your inbox by tomorrow morning — usually before it has been picked over.",
  },
  {
    q: "What if my company isn't listed?",
    a: "Add it by name once you're signed in. If it hires through Greenhouse, Lever, Ashby or Gem we pick its roles up automatically. If we can't find its board yet, your list says so plainly instead of leaving you waiting on silence.",
  },
  {
    q: "What does it cost?",
    a: "Nothing right now. Crush is free while we're early.",
  },
];

function roundDown(n: number, to: number): string {
  return `${(Math.floor(n / to) * to).toLocaleString("en-US")}+`;
}

// "Monday, November 16" in New York, where the morning check is timed.
function dateline(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

const activeJobs = { select: { jobs: { where: { status: "ACTIVE" as const } } } };

/**
 * Everything on this page that comes from the database, cached for an hour.
 * None of it is per-visitor, and the "popular" ordering alone aggregates the
 * whole jobs table — not something to redo on every landing-page hit.
 */
const getLandingData = unstable_cache(
  async () => {
    const [companyCount, openRoleCount, popularRows, collections] = await Promise.all([
      prisma.company.count().catch(() => 0),
      prisma.job.count({ where: { status: "ACTIVE" } }).catch(() => 0),
      // Starter picks for the list builder: what people already follow, then
      // whoever is hiring most — and only companies with a logo to show.
      prisma.company.findMany({
        where: { AND: [relevantCompanyWhere, { website: { not: null } }, { jobs: { some: { status: "ACTIVE" } } }] },
        orderBy: [{ trackedBy: { _count: "desc" } }, { jobs: { _count: "desc" } }],
        take: 8,
        select: { id: true, name: true, slug: true, website: true, _count: activeJobs },
      }).catch(() => []),
      prisma.collection.findMany({
      where: listedCollections,
        orderBy: { createdAt: "asc" },
        take: 4,
        select: {
          name: true,
          slug: true,
          description: true,
          _count: { select: { companies: true } },
          companies: {
            orderBy: { displayOrder: "asc" },
            take: 5,
            select: { company: { select: { name: true, website: true } } },
          },
        },
      }).catch(() => []),
    ]);
    return { companyCount, openRoleCount, popularRows, collections };
  },
  ["landing-data-v1"],
  { revalidate: 3600 },
);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  if (code) redirect(`/api/auth/callback?code=${code}`);

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (authUser) redirect("/dashboard");

  const [{ companyCount, openRoleCount, popularRows, collections }, fresh] = await Promise.all([
    getLandingData(),
    getFreshness().catch(() => ({ raised: [], fresh: [], newThisMonth: 0, raisedThisMonth: 0 })),
  ]);

  const popular: Pick[] = popularRows.map((c) => ({
    id: c.id, name: c.name, slug: c.slug, website: c.website, openRoles: c._count.jobs,
  }));

  const today = dateline();

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
      <SiteNav user={null} />

      {/* ── Dateline ─────────────────────────────────────────────────────── */}
      <div className="border-b border-foreground/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 font-mono text-[0.7rem] text-muted-foreground sm:px-6">
          <span>{today}</span>
          <span className="hidden sm:inline">
            {companyCount >= 100 ? `${roundDown(companyCount, 100)} companies on file` : "Not a job board"} · Boards checked
            every morning
          </span>
          <span>
            {fresh.newThisMonth > 0 ? `${fresh.newThisMonth} new companies this month` : "Free while we're early"}
          </span>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:pb-24 lg:pt-20">
        <div className="grid grid-cols-1 items-start gap-x-14 gap-y-14 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="stagger-children space-y-7">
            <p className="kicker animate-rise">Not a job board</p>

            <h1 className="animate-rise font-heading text-[3rem] font-bold leading-[0.95] tracking-[-0.045em] sm:text-[4.1rem] lg:text-[4.4rem] xl:text-[4.9rem]">
              The companies you&apos;d <span className="font-medium italic text-primary">actually</span> leave for.
            </h1>

            <p className="animate-rise max-w-[34rem] text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Tell us who you have a crush on. We watch their job boards every morning and email you the day your exact
              role opens. <span className="text-foreground">One email. Nothing else.</span>
            </p>

            <div className="animate-rise max-w-[34rem]">
              <ListBuilder popular={popular} />
            </div>
          </div>

          <div className="animate-rise lg:pt-4" style={{ animationDelay: "160ms" }}>
            <HotList rows={popular.slice(0, 6)} dateline={today} />
          </div>
        </div>
      </section>

      {/* ── Fresh on Crush ───────────────────────────────────────────────── */}
      {(fresh.raised.length > 0 || fresh.fresh.length > 0) && (
        <section className="border-y border-foreground bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2">
                <p className="kicker">Fresh on Crush</p>
                <h2 className="font-heading text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                  Just raised. <span className="font-medium italic">Just listed.</span>
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-snug text-muted-foreground">
                Found every morning in Y Combinator&apos;s newest batches and the week&apos;s funding announcements —
                listed only once we can read their job board.
              </p>
            </div>

            <div className="mt-9 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-2">
              {[
                {
                  title: "Just raised",
                  note: fresh.raisedThisMonth > 0 ? `${fresh.raisedThisMonth} this month` : null,
                  rows: fresh.raised.map((c) => ({ ...c, tag: c.label })),
                },
                {
                  title: "New on Crush",
                  note: fresh.newThisMonth > 0 ? `${fresh.newThisMonth} this month` : null,
                  rows: fresh.fresh.map((c) => ({ ...c, tag: c.via })),
                },
              ]
                .filter((col) => col.rows.length > 0)
                .map((col) => (
                  <div key={col.title}>
                    <h3 className="flex items-baseline justify-between border-b-[3px] border-foreground pb-2">
                      <span className="label-caps text-foreground">{col.title}</span>
                      {col.note && <span className="font-mono text-xs text-muted-foreground">{col.note}</span>}
                    </h3>
                    <ol>
                      {col.rows.map((c, i) => (
                        <li key={c.slug} className="border-b border-foreground/15">
                          <Link
                            href={`/companies/${c.slug}`}
                            className="group flex items-center gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Rank n={i + 1} className="w-7 shrink-0 text-lg text-muted-foreground" />
                            <CompanyLogo name={c.name} website={c.website} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-heading text-lg font-semibold leading-tight tracking-[-0.01em] group-hover:text-primary">
                                {c.name}
                              </span>
                              <span className="mt-0.5 flex items-center gap-2">
                                {c.tag && <Tag tone={col.title === "Just raised" ? "red" : "graphite"} className="text-[0.6rem]">{c.tag}</Tag>}
                                <span className="font-mono text-xs text-muted-foreground">{agoShort(c.at)}</span>
                              </span>
                            </span>
                            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                              <span className="font-semibold text-foreground">{c.openRoles}</span> open
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="max-w-2xl space-y-3">
          <p className="kicker">How it works</p>
          <h2 className="font-heading text-4xl font-bold leading-[1] tracking-[-0.04em] sm:text-[3.4rem]">
            Three steps, <span className="font-medium italic">then we go quiet.</span>
          </h2>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-3">
          {STEPS.map(({ n, title, body }) => (
            <li key={n} className="space-y-4 border-t-[3px] border-foreground pt-5">
              <Rank n={Number(n)} className="block text-5xl text-primary" />
              <h3 className="font-heading text-2xl font-bold tracking-[-0.025em]">{title}</h3>
              <p className="max-w-[34ch] leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Their inbox vs. ours ─────────────────────────────────────────── */}
      <section className="bg-ink-band text-ink-band-foreground">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-x-14 gap-y-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div className="space-y-6">
            <h2 className="font-heading text-[2.7rem] font-bold leading-[0.98] tracking-[-0.045em] sm:text-[3.6rem]">
              Job boards send you everything.
              <br />
              <span className="font-medium italic text-primary">We send one.</span>
            </h2>
            <div className="max-w-[46ch] space-y-3 leading-relaxed text-ink-band-foreground/75">
              <p>
                Everyone else is racing to show you more — more listings, more alerts, more applications on autopilot.
                More is the problem.
              </p>
              <p>
                You already know the dozen places you&apos;d go. What you don&apos;t know is the morning one of them
                opens your job. That is the only thing Crush tells you.
              </p>
            </div>
            <form action={signInWithGoogle}>
              <Button size="xl" type="submit">
                Start your list
                <ArrowRight className="size-4" />
              </Button>
            </form>
          </div>

          {/* An inbox: six things you didn't ask for, one you did. */}
          <div aria-hidden className="w-full border-t-[3px] border-ink-band-foreground">
            <p className="label-caps flex justify-between py-3 text-ink-band-foreground/50">
              <span>Inbox</span>
              <span>7 unread</span>
            </p>
            <ul className="divide-y divide-ink-band-foreground/15 border-y border-ink-band-foreground/15 font-mono text-[0.8rem]">
              {JUNK.map((j, i) => (
                <li key={i} className="flex gap-4 py-2.5 text-ink-band-foreground/40">
                  <span className="w-28 shrink-0 truncate">{j.from}</span>
                  <span className="truncate line-through decoration-ink-band-foreground/40">{j.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-start gap-4 bg-ink-band-foreground px-4 py-4 text-ink-band">
              <span className="mt-1.5 inline-block size-2.5 shrink-0 rounded-full bg-primary" />
              <span className="min-w-0">
                <span className="label-caps block text-ink-band/60">Crush</span>
                <span className="mt-1 block font-heading text-xl font-bold leading-tight tracking-[-0.02em]">
                  Figma just opened your role.
                </span>
                <span className="mt-1 block font-mono text-xs text-ink-band/60">Senior Account Executive · New York</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── By the numbers ───────────────────────────────────────────────── */}
      <section className="border-b border-foreground bg-paper">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-10 px-4 py-14 sm:px-6 lg:grid-cols-4">
          {[
            { k: "Companies on file", v: companyCount >= 100 ? roundDown(companyCount, 100) : "—" },
            { k: "Roles open today", v: openRoleCount >= 1000 ? roundDown(openRoleCount, 1000) : openRoleCount.toLocaleString("en-US") },
            { k: "Boards checked", v: "Daily" },
            { k: "Emails per match", v: "1" },
          ].map(({ k, v }) => (
            <div key={k} className="flex flex-col-reverse gap-2 border-t-[3px] border-foreground pt-3">
              <dd className="font-heading text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{v}</dd>
              <dt className="label-caps text-muted-foreground">{k}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Collections: bundles to start from ───────────────────────────── */}
      {collections.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl space-y-3">
              <p className="kicker">Don&apos;t have a list yet?</p>
              <h2 className="font-heading text-4xl font-bold leading-[1] tracking-[-0.04em] sm:text-5xl">
                Borrow someone&apos;s <span className="font-medium italic">type.</span>
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                Hand-picked bundles of companies. Follow a whole one in a click, then cross off the ones you
                wouldn&apos;t really leave for.
              </p>
            </div>
            <Link
              href="/collections"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
            >
              All collections
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            {collections.map((col) => (
              <li key={col.slug}>
                <Link
                  href={`/collections/${col.slug}`}
                  className="group flex h-full flex-col gap-3 border-t border-foreground py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-heading text-2xl font-bold leading-tight tracking-[-0.025em] group-hover:text-primary">
                      {col.name}
                    </h3>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {col._count.companies} companies
                    </span>
                  </div>
                  {col.description && (
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{col.description}</p>
                  )}
                  <div className="mt-auto flex items-center gap-1.5 pt-1">
                    {col.companies.map(({ company }) => (
                      <CompanyLogo key={company.name} name={company.name} website={company.website} size="sm" />
                    ))}
                    {col._count.companies > col.companies.length && (
                      <span className="pl-1 font-mono text-xs text-muted-foreground">
                        +{col._count.companies - col.companies.length}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Small print ──────────────────────────────────────────────────── */}
      <section className="border-t border-foreground bg-paper">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-12 gap-y-8 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-3">
            <p className="kicker">The small print</p>
            <h2 className="font-heading text-4xl font-bold leading-[1] tracking-[-0.04em]">Fair questions.</h2>
          </div>
          <dl className="divide-y divide-foreground/20 border-y border-foreground">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="grid gap-x-8 gap-y-2 py-5 sm:grid-cols-[14rem_1fr]">
                <dt className="font-heading text-lg font-bold leading-snug tracking-[-0.015em]">{q}</dt>
                <dd className="leading-relaxed text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Close ────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="frame flex flex-col items-start gap-6 px-6 py-12 sm:px-12 sm:py-16 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <p className="kicker">Your list</p>
            <h2 className="max-w-2xl font-heading text-4xl font-bold leading-[0.98] tracking-[-0.045em] sm:text-6xl">
              You already know who&apos;s on it.
            </h2>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
              Write it down. We&apos;ll take it from there.
            </p>
          </div>
          <form action={signInWithGoogle} className="shrink-0">
            <Button size="xl" type="submit">
              Start your list — it&apos;s free
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="mt-auto">
        <Rule />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <Wordmark size="sm" />
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/companies" className="hover:text-foreground">Companies</Link>
            <Link href="/collections" className="hover:text-foreground">Collections</Link>
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
            <span className="font-mono text-xs text-muted-foreground/70">© {new Date().getFullYear()} Crush</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
