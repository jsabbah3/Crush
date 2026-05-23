import { notFound } from "next/navigation";
import { ExternalLink, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CompanyLogo } from "@/components/company-logo";
import { FollowButton } from "@/components/follow-button";
import { CriteriaEditor } from "@/components/criteria-editor";
import { JobCard } from "@/components/job-card";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { slug } = await params;

  const [company, tracked, dbUser] = await Promise.all([
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
        })
      : null,
    authUser
      ? prisma.user.findUnique({
          where: { id: authUser.id },
          select: { defaultCriteria: true },
        })
      : null,
  ]);

  const defaultCriteria = dbUser?.defaultCriteria as {
    keywords: string[];
    remoteOnly: boolean | null;
    locationFilter: string | null;
  } | null ?? null;

  if (!company) notFound();

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
              defaultCriteria={defaultCriteria}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {company.industry && (
              <Badge variant="outline" className="text-xs">
                {company.industry}
              </Badge>
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

      {/* Criteria editor (logged-in, following) */}
      {tracked && (
        <>
          <Separator />
          <section className="space-y-3">
            <div>
              <h2 className="font-medium">Your alert criteria</h2>
              <p className="text-sm text-muted-foreground">
                We'll only notify you when a role matches these filters. Leave all blank to match any role.
              </p>
            </div>
            <CriteriaEditor tracked={tracked} />
          </section>
        </>
      )}

      <Separator />

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
