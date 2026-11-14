import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink, Users, Rss, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CompanyLogo } from "@/components/company-logo";
import { FollowButton } from "@/components/follow-button";
import { JobCard } from "@/components/job-card";
import { RoleList } from "@/components/role-list";
import { MarkdownBody } from "@/components/markdown-body";
import { JobPostingJsonLd } from "@/components/job-posting-jsonld";
import { isCompanyPublic } from "@/lib/company-relevance";
import { boardStatus } from "@/lib/board-status";
import { HiringPulse } from "@/components/hiring-pulse";
import { Tag } from "@/components/brand";

// How many open roles to send to the page. Enough for the biggest boards we
// track; the list filters and paginates client-side.
const MAX_ROLES = 400;
// JobPosting structured data is only emitted for the newest few.
const JSONLD_ROLES = 20;
const DAY = 86400000;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await prisma.company.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      industry: true,
      sourceType: true,
      tags: true,
      insights: { select: { id: true }, take: 1 },
      jobs: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 },
    },
  });
  if (!company) return {};

  // Private companies (no ATS/tag/industry signal) don't get real metadata
  // for anyone who isn't already tracking them — see isCompanyPublic().
  if (!isCompanyPublic(company)) {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const tracked = authUser
      ? await prisma.trackedCompany.findFirst({
          where: { userId: authUser.id, company: { slug } },
          select: { id: true },
        })
      : null;
    if (!tracked) return {};
  }

  const hasGuide = company.insights.length > 0;
  const hasJobs = company.jobs.length > 0;
  // Thin pages (no jobs, no guide, no description) stay reachable but are
  // kept out of the index until they have something unique to rank on.
  const isThin = !hasGuide && !hasJobs && !company.description;

  const title = hasGuide
    ? `Getting hired at ${company.name} — Process, culture, and what they look for | Crush`
    : `${company.name} — Jobs & Hiring | Crush`;
  const description = company.description
    ? `${company.description.slice(0, 140)} — Track ${company.name} on Crush to get alerted when they hire.`
    : `Track ${company.name} on Crush. Get one email the day a role opens that matches what you're looking for.`;

  return {
    title,
    description,
    alternates: { canonical: `/companies/${slug}` },
    openGraph: { title, description, url: `/companies/${slug}`, type: "website" },
    ...(isThin ? { robots: { index: false } } : {}),
  };
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const { slug } = await params;

  const [company, tracked] = await Promise.all([
    prisma.company.findUnique({
      where: { slug },
      include: {
        jobs: {
          where: { status: "ACTIVE" },
          orderBy: { postedAt: "desc" },
          take: MAX_ROLES,
        },
        signals: {
          where: { type: "blog_post" },
          orderBy: { publishedAt: "desc" },
          take: 5,
        },
        insights: {
          orderBy: { publishedAt: "desc" },
        },
        _count: { select: { trackedBy: true } },
      },
    }),
    authUser
      ? prisma.trackedCompany.findFirst({
          where: { userId: authUser.id, company: { slug } },
          select: { id: true },
        })
      : null,
  ]);

  if (!company) notFound();

  // Private companies (no ATS/tag/industry signal) are only visible to
  // whoever is already tracking them — see isCompanyPublic(). This is what
  // makes self-serve "Add Company" safe: a real company graduates to public
  // the moment ATS detection finds something; a zero-signal personal pick
  // (see the outdoor-brand incident) never becomes a stranger-visible page.
  if (!isCompanyPublic(company) && !tracked) notFound();

  const relatedCompanies = await prisma.company.findMany({
    where: { industry: company.industry ?? undefined, slug: { not: slug } },
    select: { name: true, slug: true, fundingStage: true },
    orderBy: { updatedAt: "desc" },
    take: 6,
  });

  // Fetch LinkedIn connections at this company
  const networkConnections = authUser
    ? await prisma.linkedInConnection.findMany({
        where: { userId: authUser.id, companyId: company.id },
        select: { firstName: true, lastName: true, title: true, linkedinUrl: true },
        orderBy: { firstName: "asc" },
        take: 10,
      })
    : [];

  // Fetch user's matches for this company (only if they follow it)
  const userMatches = authUser && tracked
    ? await prisma.match.findMany({
        where: { trackedCompanyId: tracked.id, dismissed: false },
        include: { job: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // Hiring pulse: daily open-role counts. The first days after a board is
  // connected are a bulk-import spike rather than hiring, so the window never
  // starts earlier than three days after tracking began.
  const since = daysAgo(90);
  const trackedFrom = company.trackingStartedAt
    ? new Date(new Date(company.trackingStartedAt).getTime() + 3 * DAY)
    : since;
  const [snapshots, postedLast30, openRoleTotal] = await Promise.all([
    prisma.companyRoleSnapshot.findMany({
      where: { companyId: company.id, capturedOn: { gte: trackedFrom > since ? trackedFrom : since } },
      orderBy: { capturedOn: "asc" },
      select: { capturedOn: true, openRolesTotal: true },
    }),
    prisma.job.count({ where: { companyId: company.id, postedAt: { gte: daysAgo(30) } } }),
    prisma.job.count({ where: { companyId: company.id, status: "ACTIVE" } }),
  ]);

  const board = boardStatus(company);
  const stage = company.fundingStage?.replace(/_/g, " ") ?? null;
  const eyebrow = [company.industry, stage, company.headquarters].filter(Boolean) as string[];

  const facts = [
    company.industry && { label: "Industry", value: company.industry },
    stage && { label: "Stage", value: stage },
    company.size && { label: "Size", value: company.size },
    company.headquarters && { label: "HQ", value: company.headquarters },
    { label: "Job board", value: board.connected ? board.board : openRoleTotal > 0 ? "On file" : "Not connected" },
  ].filter(Boolean) as { label: string; value: string }[];

  // Only what the role list renders — job descriptions stay on the server.
  const roles = company.jobs.map((j) => ({
    id: j.id, title: j.title, type: j.type, location: j.location, remote: j.remote,
    salaryMin: j.salaryMin, salaryMax: j.salaryMax, url: j.url, postedAt: j.postedAt,
  }));

  return (
    <div className="space-y-10">
      <JobPostingJsonLd
        jobs={company.jobs.slice(0, JSONLD_ROLES)}
        companyName={company.name}
        companyWebsite={company.website}
      />

      {/* Company header */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <CompanyLogo name={company.name} website={company.website} size="lg" className="size-20 shrink-0 text-3xl" />
        <div className="min-w-0 flex-1 space-y-3">
          {eyebrow.length > 0 && (
            <p className="label-caps flex flex-wrap gap-x-2 gap-y-1 text-graphite">
              {eyebrow.map((e, i) => (
                <span key={e} className="flex items-center gap-2">
                  {i > 0 && <span className="text-foreground/25">/</span>}
                  {e}
                </span>
              ))}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="font-heading text-4xl font-bold leading-[1] tracking-[-0.04em] sm:text-[3.4rem]">
              {company.name}
            </h1>
            {tracked && <Tag tone="ink">On your list</Tag>}
          </div>
          {company.description && (
            <p className="max-w-[65ch] leading-relaxed text-muted-foreground">{company.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <FollowButton
              company={{ id: company.id, name: company.name }}
              tracked={tracked}
              userId={authUser?.id ?? null}
              size="default"
            />
            <p className="text-sm text-muted-foreground">
              {tracked ? (
                <>
                  New roles are read against your{" "}
                  <a href="/dashboard" className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-2 hover:text-primary">
                    saved roles
                  </a>
                  .
                </>
              ) : board.connected ? (
                <>One email, the day your role opens here. Nothing else.</>
              ) : (
                <>Add it to your list — we&apos;ll start writing once their board is connected.</>
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Two-column: content + sticky rail (never strands the width) */}
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        {/* Main column */}
        <div className="min-w-0 space-y-10 lg:order-1">
          {/* Insider guides */}
          {company.insights.length > 0 && (
            <section className="space-y-3">
              {company.insights.map((insight) => (
                <details key={insight.id} className="sheet group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 [&::-webkit-details-marker]:hidden">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <BookOpen className="size-4 shrink-0 text-primary" />
                      <span className="truncate font-heading text-base font-bold tracking-[-0.01em]">{insight.title}</span>
                      {insight.author && (
                        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">— {insight.author}</span>
                      )}
                    </div>
                    <svg
                      className="size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--dur-med)] ease-[var(--ease-settle)] group-open:rotate-180"
                      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="border-t border-dashed border-foreground/20 px-5 py-5">
                    <MarkdownBody markdown={insight.body} />
                  </div>
                </details>
              ))}
            </section>
          )}

          {/* Your matches */}
          {userMatches.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-baseline gap-2 font-heading text-2xl font-extrabold tracking-[-0.02em]">
                Your matches
                <span className="font-mono text-sm font-normal tabular-nums text-muted-foreground">
                  {userMatches.length}
                </span>
              </h2>
              <div className="space-y-3">
                {userMatches.map((match) => (
                  <JobCard
                    key={match.id}
                    job={{ ...match.job, company }}
                    matchId={match.id}
                    applicationStatus={match.applicationStatus as "INTERESTED"}
                    hideCompany
                  />
                ))}
              </div>
            </section>
          )}

          {/* Open roles */}
          <section className="space-y-4">
            <h2 className="flex items-baseline gap-2 font-heading text-2xl font-extrabold tracking-[-0.02em]">
              Open roles
              <span className="font-mono text-sm font-normal tabular-nums text-muted-foreground">
                {openRoleTotal.toLocaleString()}
              </span>
            </h2>
            {roles.length > 0 ? (
              <RoleList jobs={roles} total={openRoleTotal} />
            ) : board.connected ? (
              <div className="border border-dashed border-foreground/25 px-6 py-10 text-center">
                <p className="mx-auto max-w-sm leading-relaxed text-muted-foreground">
                  Nothing open right now. We read {company.name}&apos;s {board.board} board every morning.{" "}
                  {tracked
                    ? "The day something fits what you asked for, you'll get an email."
                    : "Add them to your list and we'll email you the day your role goes up."}
                </p>
              </div>
            ) : (
              <div className="border border-dashed border-kraft bg-kraft-soft/60 px-6 py-8">
                <p className="label-caps text-clay">Board not connected</p>
                <p className="mt-2 max-w-[60ch] leading-relaxed">
                  We haven&apos;t found {company.name}&apos;s job board yet, so we can&apos;t see what they have open —
                  an empty list here doesn&apos;t mean they aren&apos;t hiring.
                </p>
                <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
                  We re-check for it regularly. If you add {company.name} to your list now, your alerts start the
                  day we connect it.
                  {company.website && (
                    <>
                      {" "}Meanwhile, their{" "}
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-2 hover:text-primary"
                      >
                        own site
                      </a>{" "}
                      is the place to look.
                    </>
                  )}
                </p>
              </div>
            )}
          </section>

          {/* Engineering blog signals */}
          {company.signals.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 font-heading text-xl font-extrabold tracking-[-0.02em]">
                <Rss className="size-4 text-muted-foreground" />
                From their blog
              </h2>
              <div className="space-y-2">
                {company.signals.map((signal) => (
                  <a
                    key={signal.id}
                    href={signal.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col gap-1 border bg-card p-3.5 transition-[border-color,transform] duration-[var(--dur-fast)] ease-[var(--ease-settle)] hover:-translate-y-px hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <p className="text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                      {signal.title}
                    </p>
                    {signal.summary && (
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {signal.summary}
                      </p>
                    )}
                    {signal.publishedAt && (
                      <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground/70">
                        {new Date(signal.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </a>
                ))}
                {company.blogRssUrl && (
                  <a
                    href={company.website ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pl-0.5 text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
                  >
                    View all posts →
                  </a>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Sticky rail — always populated */}
        <aside className="space-y-6 lg:sticky lg:top-20 lg:order-2 lg:self-start">
          {board.connected && <HiringPulse points={snapshots} postedLast30={postedLast30} />}

          {/* At a glance */}
          <div className="space-y-3 border bg-card p-4">
            <h2 className="label-caps text-muted-foreground">At a glance</h2>
            <dl className="space-y-2 text-sm">
              {facts.map((f) => (
                <div key={f.label} className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">{f.label}</dt>
                  <dd className="text-right font-medium capitalize">{f.value}</dd>
                </div>
              ))}
              {company._count.trackedBy > 0 && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">On lists</dt>
                  <dd className="text-right font-mono font-medium tabular-nums">
                    {company._count.trackedBy.toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                Visit website <ExternalLink className="size-3" />
              </a>
            )}
          </div>

          {/* People you know */}
          {networkConnections.length > 0 && (
            <div id="network" className="scroll-mt-20 space-y-2.5">
              <h2 className="label-caps flex items-center gap-1.5 text-graphite">
                <Users className="size-3.5" />
                {networkConnections.length === 1 ? "You know 1 person here" : `You know ${networkConnections.length} people here`}
              </h2>
              <div className="space-y-1.5">
                {networkConnections.map((c, i) => {
                  const inner = (
                    <>
                      <span className="truncate font-medium">{c.firstName} {c.lastName}</span>
                      {c.title && <span className="truncate text-xs text-muted-foreground">{c.title}</span>}
                    </>
                  );
                  return c.linkedinUrl ? (
                    <a
                      key={i}
                      href={c.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col border bg-card px-3 py-2 text-sm transition-colors hover:border-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div key={i} className="flex flex-col border bg-card px-3 py-2 text-sm">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Related companies */}
          {relatedCompanies.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="label-caps text-muted-foreground">
                More in {company.industry}
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {relatedCompanies.map((c) => (
                  <a
                    key={c.slug}
                    href={`/companies/${c.slug}`}
                    className="flex items-center gap-1.5 border bg-card px-2.5 py-1.5 text-xs transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <span className="font-semibold">{c.name}</span>
                    {c.fundingStage && (
                      <span className="capitalize text-muted-foreground">{c.fundingStage.replace(/_/g, " ")}</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
