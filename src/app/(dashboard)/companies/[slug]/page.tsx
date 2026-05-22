import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrackButton } from "@/components/track-button";
import { CriteriaEditor } from "@/components/criteria-editor";
import { JobCard } from "@/components/job-card";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
    prisma.trackedCompany.findFirst({
      where: { userId: user.id, company: { slug } },
    }),
  ]);

  if (!company) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {company.industry && <Badge variant="outline">{company.industry}</Badge>}
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
          <p className="text-xs text-muted-foreground">
            {company._count.trackedBy} {company._count.trackedBy === 1 ? "person" : "people"} tracking
          </p>
        </div>
        <TrackButton
          companyId={company.id}
          trackedId={tracked?.id}
        />
      </div>

      {company.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{company.description}</p>
      )}

      {tracked && (
        <>
          <Separator />
          <section className="space-y-3">
            <div>
              <h2 className="font-medium">Alert criteria</h2>
              <p className="text-sm text-muted-foreground">
                We'll only notify you when a job matches these filters. Leave all blank to match any role.
              </p>
            </div>
            <CriteriaEditor tracked={tracked} />
          </section>
        </>
      )}

      <Separator />

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
              No open roles right now. We'll alert you when something matches.
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
