import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink, Users, Rss, BookOpen, Network } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CompanyLogo } from "@/components/company-logo";
import { FollowButton } from "@/components/follow-button";
import { JobCard } from "@/components/job-card";
import { MarkdownBody } from "@/components/markdown-body";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await prisma.company.findUnique({
    where: { slug },
    select: { name: true, description: true, industry: true, insights: { select: { id: true }, take: 1 } },
  });
  if (!company) return {};

  const hasGuide = company.insights.length > 0;

  return {
    title: hasGuide
      ? `Getting hired at ${company.name} — Process, culture, and what they look for | Crush`
      : `${company.name} — Jobs & Hiring | Crush`,
    description:
      company.description
        ? `${company.description.slice(0, 140)} — Track ${company.name} on Crush to get alerted when they hire.`
        : `Track ${company.name} on Crush. Get one alert the moment a role opens that matches your criteria.`,
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

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Company header */}
      <div className="flex items-start gap-4">
        <CompanyLogo name={company.name} website={company.website} size="lg" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight leading-tight">{company.name}</h1>
            <FollowButton
              company={{ id: company.id, name: company.name }}
              tracked={tracked}
              userId={authUser?.id ?? null}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {company.industry && (
              <Badge variant="outline" className="text-xs">
                {company.industry}
              </Badge>
            )}
            {company.fundingStage && (
              <Badge variant="secondary" className="text-xs capitalize">
                {company.fundingStage.replace(/_/g, " ")}
              </Badge>
            )}
            {company.size && (
              <span className="text-xs capitalize text-muted-foreground">{company.size}</span>
            )}
            {company.headquarters && <span>{company.headquarters}</span>}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Website <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          {company._count.trackedBy > 0 && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3" />
              {company._count.trackedBy.toLocaleString()} following on Crush
            </p>
          )}
        </div>
      </div>

      {company.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{company.description}</p>
      )}

      {tracked && (
        <p className="text-sm text-muted-foreground">
          ✓ Following — we&apos;ll match new roles against your{" "}
          <a href="/dashboard" className="underline underline-offset-2 hover:text-foreground transition-colors">
            saved roles
          </a>
          .
        </p>
      )}

      {/* People you know */}
      {networkConnections.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">
              {networkConnections.length === 1 ? "1 connection here" : `${networkConnections.length} connections here`}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {networkConnections.map((c, i) => (
              c.linkedinUrl ? (
                <a
                  key={i}
                  href={c.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:border-border hover:shadow-sm transition-all"
                >
                  <span className="font-medium">{c.firstName} {c.lastName}</span>
                  {c.title && <span className="text-xs text-muted-foreground">{c.title}</span>}
                </a>
              ) : (
                <div key={i} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                  <span className="font-medium">{c.firstName} {c.lastName}</span>
                  {c.title && <span className="text-xs text-muted-foreground">{c.title}</span>}
                </div>
              )
            ))}
          </div>
        </section>
      )}

      <Separator />

      {/* Insider guides — shown first when they exist */}
      {company.insights.length > 0 && (
        <section className="space-y-4">
          {company.insights.map((insight) => (
            <details key={insight.id} open className="group rounded-xl border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 shrink-0" />
                  <span className="font-semibold text-sm">{insight.title}</span>
                  {insight.author && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">— {insight.author}</span>
                  )}
                </div>
                <svg
                  className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180 shrink-0"
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
          <Separator />
        </section>
      )}

      {/* Your matches */}
      {userMatches.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading font-semibold tracking-tight">
            Your matches
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({userMatches.length})
            </span>
          </h2>
          <div className="space-y-2">
            {userMatches.map((match) => (
              <JobCard
                key={match.id}
                job={{ ...match.job, company }}
                matchId={match.id}
                applicationStatus={match.applicationStatus as "INTERESTED"}
              />
            ))}
          </div>
          <Separator />
        </section>
      )}

      {/* Open roles */}
      <section className="space-y-3">
        <h2 className="font-heading font-semibold tracking-tight">
          Open roles
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({company.jobs.length})
          </span>
        </h2>
        {company.jobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No open roles right now.{" "}
              {tracked
                ? "We'll email you when something matches."
                : "Follow this company to get alerted when they hire."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {company.jobs.map((job) => (
              <JobCard key={job.id} job={{ ...job, company }} />
            ))}
          </div>
        )}
      </section>

      {/* Engineering blog signals */}
      {company.signals.length > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Rss className="size-4 text-muted-foreground" />
              <h2 className="font-medium text-sm">From the engineering blog</h2>
            </div>
            <div className="space-y-2">
              {company.signals.map((signal) => (
                <a
                  key={signal.id}
                  href={signal.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-1 rounded-lg border bg-card p-3.5 transition-all duration-150 hover:border-foreground/20 hover:shadow-sm"
                >
                  <p className="text-sm font-medium leading-snug group-hover:text-foreground transition-colors">
                    {signal.title}
                  </p>
                  {signal.summary && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {signal.summary}
                    </p>
                  )}
                  {signal.publishedAt && (
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
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
        </>
      )}
    </div>
  );
}
