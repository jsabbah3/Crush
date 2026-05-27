import { notFound } from "next/navigation";
import { ExternalLink, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CompanyLogo } from "@/components/company-logo";
import { FollowButton } from "@/components/follow-button";
import { JobCard } from "@/components/job-card";

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
            <h1 className="text-2xl font-bold leading-tight">{company.name}</h1>
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

      <Separator />

      {/* Your matches */}
      {userMatches.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">
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
        <h2 className="font-medium">
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
    </div>
  );
}
