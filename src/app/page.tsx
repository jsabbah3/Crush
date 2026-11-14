import type { CSSProperties } from "react";
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
import { HeroLetter } from "@/components/hero-letter";
import { ListBuilder, type Pick } from "@/components/list-builder";
import { AirmailRule, PaperPlane, Postmark, Rubber, Seal, Underline, Wordmark } from "@/components/brand";
import { signInWithGoogle } from "@/app/actions/auth";

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
    title: "Get one letter.",
    body: "We check each company's own job board early every morning. If your role went up, the letter is waiting when you wake.",
  },
];

// What an inbox full of job-board mail actually says.
const JUNK = [
  { text: "127 new jobs for you!", tilt: -8, x: "0%", y: "2%" },
  { text: "Are you still looking?", tilt: 6, x: "44%", y: "0%" },
  { text: "Jobs you may be interested in", tilt: -3, x: "12%", y: "17%" },
  { text: "A recruiter viewed your profile", tilt: 4, x: "30%", y: "33%" },
  { text: "Top picks this week (43)", tilt: -6, x: "2%", y: "40%" },
  { text: "Apply now — 2,000+ applicants", tilt: 3, x: "8%", y: "58%" },
  { text: "Don't miss out: 18 new roles", tilt: -4, x: "0%", y: "76%" },
];

const FAQ = [
  {
    q: "How is this different from LinkedIn alerts?",
    a: "LinkedIn alerts on keywords, across every company that pays to post. Crush watches only the companies you named, reads their own job boards directly, and writes only when the role fits what you told us.",
  },
  {
    q: "How fast will I hear?",
    a: "Boards are checked early every morning, and letters go out right after. A role posted today is in your inbox by tomorrow morning — usually before it has been picked over.",
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

function fundingLabel(stage: string | null): string {
  const map: Record<string, string> = {
    pre_seed: "Pre-seed", seed: "Seed", series_a: "Series A", series_b: "Series B",
    series_c: "Series C", growth: "Growth", public: "Public",
  };
  return stage ? (map[stage] ?? stage) : "Funded";
}

function roundDown(n: number, to: number): string {
  return `${(Math.floor(n / to) * to).toLocaleString("en-US")}+`;
}

const activeJobs = { select: { jobs: { where: { status: "ACTIVE" as const } } } };

/**
 * Everything on this page that comes from the database, cached for an hour.
 * None of it is per-visitor, and the "popular" ordering alone aggregates the
 * whole jobs table — not something to redo on every landing-page hit.
 */
const getLandingData = unstable_cache(
  async () => {
    const [recentlyFunded, companyCount, openRoleCount, popularRows, collections] = await Promise.all([
      prisma.company.findMany({
        where: { recentlyFundedAt: { not: null } },
        orderBy: { recentlyFundedAt: "desc" },
        take: 6,
        select: { name: true, website: true, slug: true, fundingStage: true, _count: activeJobs },
      }).catch(() => []),
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
    return { recentlyFunded, companyCount, openRoleCount, popularRows, collections };
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

  const { recentlyFunded, companyCount, openRoleCount, popularRows, collections } = await getLandingData();

  const popular: Pick[] = popularRows.map((c) => ({
    id: c.id, name: c.name, slug: c.slug, website: c.website, openRoles: c._count.jobs,
  }));

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
      <SiteNav user={null} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:pb-24 lg:pt-20">
        <div className="grid grid-cols-1 items-center gap-x-10 gap-y-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="stagger-children space-y-7">
            <p className="label-caps animate-rise flex items-center gap-2 text-muted-foreground">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full rounded-full bg-moss opacity-70 motion-safe:animate-ping" />
                <span className="relative inline-flex size-1.5 rounded-full bg-moss" />
              </span>
              {companyCount >= 100 ? `${roundDown(companyCount, 100)} companies on file` : "Not a job board"}
              <span className="hidden text-foreground/25 sm:inline">/</span>
              <span className="hidden sm:inline">Boards checked every morning</span>
            </p>

            <h1 className="animate-rise font-heading text-[2.85rem] font-black leading-[0.98] tracking-[-0.035em] sm:text-[3.9rem] lg:text-[4.15rem] xl:text-[4.5rem]">
              The companies you&apos;d{" "}
              <span className="relative inline-block italic text-primary">
                actually
                <Underline />
              </span>{" "}
              leave for.
            </h1>

            <p className="animate-rise max-w-[34rem] text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Tell us who you have a crush on. We watch their job boards and write to you the day your exact role opens.{" "}
              <span className="text-foreground">One letter. Nothing else.</span>
            </p>

            <div className="animate-rise max-w-[34rem]">
              <ListBuilder popular={popular} />
            </div>
          </div>

          <HeroLetter />
        </div>
      </section>

      {/* ── Stamp sheet: just funded ─────────────────────────────────────── */}
      {recentlyFunded.length > 0 && (
        <section className="border-y border-foreground/10 bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1.5">
                <p className="label-caps text-airmail">New issues</p>
                <h2 className="font-heading text-2xl font-extrabold tracking-[-0.02em] sm:text-3xl">
                  Just funded, about to hire.
                </h2>
              </div>
              <p className="hand text-airmail">money in the bank = roles on the way →</p>
            </div>

            <ul className="-mx-4 mt-8 flex gap-5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
              {recentlyFunded.map((c, i) => (
                <li key={c.slug} className="shrink-0">
                  <Link
                    href={`/companies/${c.slug}`}
                    className="stamp-lift group block rounded-sm transition-transform duration-200 ease-[var(--ease-settle)] hover:-translate-y-1.5 hover:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ transform: `rotate(${[-2, 1.5, -1, 2.5, -1.5, 1][i % 6]}deg)` }}
                  >
                    <span className="stamp paper-light block h-48 w-36" style={{ "--perf": "8px" } as CSSProperties}>
                      <span className="flex h-full flex-col items-center border border-foreground/60 px-2 pb-2 pt-1.5">
                        <span className="label-caps flex w-full items-center justify-between text-[0.55rem] text-foreground/60">
                          Crush Post
                          <span className="font-mono text-[0.7rem] font-semibold tracking-normal text-primary">
                            {c._count.jobs > 0 ? c._count.jobs : "·"}
                          </span>
                        </span>
                        <span className="flex flex-1 items-center">
                          <CompanyLogo name={c.name} website={c.website} size="sm" className="size-14 border-0 text-2xl" />
                        </span>
                        <span className="line-clamp-2 text-center font-heading text-sm font-bold leading-tight">
                          {c.name}
                        </span>
                        <span className="label-caps mt-1.5 text-[0.58rem] text-moss">{fundingLabel(c.fundingStage)}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 font-mono text-[0.7rem] text-muted-foreground">
              The number in the corner is open roles today.
            </p>
          </div>
        </section>
      )}

      {/* ── How it works: one route, three stops ─────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="max-w-2xl space-y-3">
          <p className="label-caps text-airmail">How it works</p>
          <h2 className="font-heading text-4xl font-black leading-[1.02] tracking-[-0.03em] sm:text-5xl">
            Three stops, <span className="italic">then we go quiet.</span>
          </h2>
        </div>

        <div className="relative mt-14">
          {/* Flight path */}
          <svg
            viewBox="0 0 1100 90"
            preserveAspectRatio="none"
            aria-hidden
            className="absolute inset-x-0 -top-9 hidden h-[5.5rem] w-full text-airmail/50 md:block"
          >
            <path
              d="M40 62 C 190 -8, 290 96, 420 46 S 660 -4, 780 50 S 980 86, 1066 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="2 9"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <PaperPlane className="absolute -top-14 right-0 hidden size-10 rotate-[8deg] text-airmail md:block" />

          <ol className="relative grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-3">
            {STEPS.map(({ n, title, body }) => (
              <li key={n} className="space-y-4">
                <span className="flex size-14 items-center justify-center rounded-full border-2 border-foreground bg-paper font-heading text-2xl font-black italic">
                  {n}
                </span>
                <h3 className="font-heading text-2xl font-extrabold tracking-[-0.02em]">{title}</h3>
                <p className="max-w-[34ch] leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Junk mail vs. one letter ─────────────────────────────────────── */}
      <section className="bg-ink-band text-ink-band-foreground">
        <AirmailRule className="opacity-90" />
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-x-12 gap-y-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div className="space-y-6">
            <h2 className="font-heading text-[2.6rem] font-black leading-[0.98] tracking-[-0.035em] sm:text-6xl">
              Job boards send junk mail.
              <br />
              <span className="italic text-[oklch(0.8_0.14_30)]">We send one letter.</span>
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

          {/* The pile, and the one that matters */}
          <div className="paper-light relative mx-auto h-[25rem] w-full max-w-md text-foreground" aria-hidden>
            {JUNK.map((j) => (
              <span
                key={j.text}
                className="absolute whitespace-nowrap rounded-[2px] border border-foreground/10 bg-[oklch(0.88_0.016_260)] px-4 py-2.5 text-sm font-medium text-foreground/45 line-through decoration-foreground/40 shadow-[0_6px_14px_-8px_oklch(0.1_0.05_266/0.7)]"
                style={{ left: j.x, top: j.y, transform: `rotate(${j.tilt}deg)` }}
              >
                {j.text}
              </span>
            ))}
            <Rubber tone="red" tilt={-11} className="absolute left-[4%] top-[24%] z-10 border-2 bg-[oklch(0.88_0.016_260)] px-3 py-2 text-xl">
              Return to sender
            </Rubber>

            <div
              className="airmail-frame absolute bottom-0 right-0 z-20 w-[74%] rounded-[3px] shadow-[0_24px_50px_-20px_oklch(0.1_0.05_266/0.8)]"
              style={{ "--tilt": "5deg", animation: "drift 7s ease-in-out infinite" } as CSSProperties}
            >
              <div className="relative px-5 pb-5 pt-12">
                <Seal className="absolute right-3 top-3 size-10" />
                <Postmark top="Crush Post" lines={["TODAY"]} waves={false} className="absolute right-10 top-2 h-12 -rotate-12 text-foreground/50" />
                <p className="label-caps text-airmail">For you only</p>
                <p className="mt-2 font-heading text-[1.6rem] font-extrabold leading-[1.05] tracking-[-0.02em]">
                  Figma is ready for you.
                </p>
                <p className="hand mt-2 text-primary">open me</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ledger: real numbers ─────────────────────────────────────────── */}
      <section className="border-b border-foreground/10 bg-paper">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-12 sm:px-6 lg:grid-cols-4">
          {[
            { k: "Companies on file", v: companyCount >= 100 ? roundDown(companyCount, 100) : "—" },
            { k: "Roles open today", v: openRoleCount >= 1000 ? roundDown(openRoleCount, 1000) : openRoleCount.toLocaleString("en-US") },
            { k: "Boards checked", v: "Daily" },
            { k: "Emails per match", v: "1" },
          ].map(({ k, v }) => (
            <div key={k} className="space-y-1.5 border-l-2 border-foreground/15 pl-4">
              <dd className="font-heading text-4xl font-black tracking-[-0.03em] sm:text-5xl">{v}</dd>
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
              <p className="label-caps text-airmail">Don&apos;t have a list yet?</p>
              <h2 className="font-heading text-4xl font-black leading-[1.02] tracking-[-0.03em] sm:text-5xl">
                Borrow someone&apos;s <span className="italic">type.</span>
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

          <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {collections.map((col) => (
              <li key={col.slug}>
                <Link
                  href={`/collections/${col.slug}`}
                  className="sheet group flex h-full flex-col gap-4 rounded-[4px] p-5 transition-[transform,border-color] duration-200 ease-[var(--ease-settle)] hover:-translate-y-1 hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-heading text-xl font-extrabold leading-tight tracking-[-0.015em] group-hover:text-primary">
                      {col.name}
                    </h3>
                    <span className="label-caps shrink-0 pt-1 text-muted-foreground">
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
      <section className="border-t border-foreground/10 bg-paper">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-12 gap-y-8 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-3">
            <p className="label-caps text-airmail">The small print</p>
            <h2 className="font-heading text-4xl font-black leading-[1.02] tracking-[-0.03em]">
              Fair questions.
            </h2>
          </div>
          <dl className="divide-y divide-dashed divide-foreground/20 border-y border-dashed border-foreground/20">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="grid gap-x-8 gap-y-2 py-5 sm:grid-cols-[14rem_1fr]">
                <dt className="font-heading text-lg font-bold leading-snug tracking-[-0.01em]">{q}</dt>
                <dd className="leading-relaxed text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Sign-off ─────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="airmail-frame rounded-[4px] shadow-[0_30px_60px_-30px_oklch(0.24_0.06_266/0.45)]">
          <div className="relative flex flex-col items-center gap-6 px-6 py-14 text-center sm:py-20">
            <Seal className="size-16" />
            <h2 className="max-w-3xl font-heading text-4xl font-black leading-[1] tracking-[-0.035em] sm:text-6xl">
              You already know who it is.
            </h2>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
              Write the list down. We&apos;ll take it from there.
            </p>
            <form action={signInWithGoogle}>
              <Button size="xl" type="submit">
                Start your list — it&apos;s free
                <ArrowRight className="size-4" />
              </Button>
            </form>
            <p className="hand absolute bottom-4 right-6 hidden -rotate-6 text-airmail sm:block">xo</p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-foreground/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <Wordmark size="sm" />
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/companies" className="hover:text-foreground">Companies</Link>
            <Link href="/collections" className="hover:text-foreground">Collections</Link>
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
            <span className="font-mono text-xs text-muted-foreground/70">© {new Date().getFullYear()} Crush</span>
          </nav>
        </div>
        <AirmailRule />
      </footer>
    </div>
  );
}
