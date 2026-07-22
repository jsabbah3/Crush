import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink, Users, Rss, BookOpen, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CompanyLogo } from "@/components/company-logo";
import { FollowButton } from "@/components/follow-button";
import { JobCard } from "@/components/job-card";
import { RoleList } from "@/components/role-list";
import { MarkdownBody } from "@/components/markdown-body";
import { JobPostingJsonLd } from "@/components/job-posting-jsonld";

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
      insights: { select: { id: true }, take: 1 },
      jobs: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 },
    },
  });
  if (!company) return {};

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
    : `Track ${company.name} on Crush. Get one alert the moment a role opens that matches your criteria.`;

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
          take: 20,
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

  const facts = [
    company.industry && { label: "Industry", value: company.industry },
    company.fundingStage && { label: "Stage", value: company.fundingStage.replace(/_/g, " ") },
    company.size && { label: "Size", value: company.size },
    company.headquarters && { label: "HQ", value: company.headquarters },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-8">
      <JobPostingJsonLd
        jobs={company.jobs}
        companyName={company.name}
        companyWebsite={company.website}
      />

      {/* Company header — full width */}
      <div className="flex items-start gap-4">
        <CompanyLogo name={company.name} website={company.website} size="lg" className="shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">{company.name}</h1>
            <FollowButton
              company={{ id: company.id, name: company.name }}
              tracked={tracked}
              userId={authUser?.id ?? null}
            />
          </div>
          {company.description && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[65ch]">{company.description}</p>
          )}
          {tracked && (
            <p className="inline-flex items-center gap-1.5 text-sm text-moss">
              <Check className="size-3.5" />
              <span className="text-muted-foreground">
                Watching — new roles are matched against your{" "}
                <a href="/dashboard" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                  saved roles
                </a>.
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Two-column: content + sticky rail (never strands the width) */}
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        {/* Main column */}
        <div className="min-w-0 space-y-8 lg:order-1">
          {/* Insider guides */}
          {company.insights.length > 0 && (
            <section className="space-y-4">
              {company.insights.map((insight) => (
                <details key={insight.id} className="group rounded-xl border bg-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="size-4 shrink-0 text-primary" />
                      <span className="font-semibold text-sm truncate">{insight.title}</span>
                      {insight.author && (
                        <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">— {insight.author}</span>
                      )}
                    </div>
                    <svg
                      className="size-4 text-muted-foreground transition-transform duration-[var(--dur-med)] ease-[var(--ease-settle)] group-open:rotate-180 shrink-0"
                      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="border-t px-5 py-5">
                    <MarkdownBody markdown={insight.body} />
                  </div>
                </details>
              ))}
            </section>
          )}

          {/* Your matches */}
          {userMatches.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-heading text-lg font-bold tracking-tight">
                Your matches
                <span className="ml-2 font-mono text-sm font-normal text-muted-foreground tabular-nums">
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

          {/* Open roles — Quiet Paper list */}
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold tracking-tight">
              Open roles
              <span className="ml-2 font-mono text-sm font-normal text-muted-foreground tabular-nums">
                {company.jobs.length}
              </span>
            </h2>
            {company.jobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/40 py-10 px-6 text-center">
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  No open roles right now. Crush checks {company.name}&apos;s careers page daily.{" "}
                  {tracked
                    ? "We'll email you the moment something matching your criteria is posted."
                    : "Follow this company to get alerted the moment they post a role."}
                </p>
              </div>
            ) : (
              <RoleList jobs={company.jobs} />
            )}
          </section>

          {/* Engineering blog signals */}
          {company.signals.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Rss className="size-4 text-muted-foreground" />
                <h2 className="font-heading text-sm font-semibold">From the engineering blog</h2>
              </div>
              <div className="space-y-2">
                {company.signals.map((signal) => (
                  <a
                    key={signal.id}
                    href={signal.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col gap-1 rounded-lg border bg-card p-3.5 transition-[border-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-settle)] hover:border-border hover:shadow-sm hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">
                      {signal.title}
                    </p>
                    {signal.summary && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {signal.summary}
                      </p>
                    )}
                    {signal.publishedAt && (
                      <p className="font-mono text-[11px] text-muted-foreground/70 mt-0.5 tabular-nums">
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
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 pl-0.5"
                  >
                    View all posts →
                  </a>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Sticky rail — always populated */}
        <aside className="space-y-6 lg:order-2 lg:sticky lg:top-20 lg:self-start">
          {/* At a glance */}
          {(facts.length > 0 || company.website || company._count.trackedBy > 0) && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <h2 className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                At a glance
              </h2>
              <dl className="space-y-2 text-sm">
                {facts.map((f) => (
                  <div key={f.label} className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground shrink-0">{f.label}</dt>
                    <dd className="text-right capitalize font-medium">{f.value}</dd>
                  </div>
                ))}
                {company._count.trackedBy > 0 && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground shrink-0">Following</dt>
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
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  Visit website <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}

          {/* People you know */}
          {networkConnections.length > 0 && (
            <div id="network" className="space-y-2.5 scroll-mt-20">
              <h2 className="flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Users className="size-3.5" />
                {networkConnections.length === 1 ? "1 connection here" : `${networkConnections.length} connections here`}
              </h2>
              <div className="space-y-1.5">
                {networkConnections.map((c, i) => {
                  const inner = (
                    <>
                      <span className="font-medium truncate">{c.firstName} {c.lastName}</span>
                      {c.title && <span className="text-xs text-muted-foreground truncate">{c.title}</span>}
                    </>
                  );
                  return c.linkedinUrl ? (
                    <a
                      key={i}
                      href={c.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col rounded-lg border bg-card px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--dur-fast)] hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div key={i} className="flex flex-col rounded-lg border bg-card px-3 py-2 text-sm">
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
              <h2 className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                More {company.industry} on Crush
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {relatedCompanies.map((c) => (
                  <a
                    key={c.slug}
                    href={`/companies/${c.slug}`}
                    className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs transition-[border-color,box-shadow] duration-[var(--dur-fast)] hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <span className="font-medium">{c.name}</span>
                    {c.fundingStage && (
                      <span className="text-muted-foreground capitalize">{c.fundingStage.replace(/_/g, " ")}</span>
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
