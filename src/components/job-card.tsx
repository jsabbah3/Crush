"use client";

import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPicker, STATUS_CONFIG, type AppStatus } from "@/components/status-picker";
import { cn } from "@/lib/utils";

type Job = {
  id: string;
  title: string;
  type: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  url: string | null;
  postedAt: Date | null;
  company: { name: string; slug: string };
};

const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
};

export function JobCard({
  job,
  matchId,
  applicationStatus,
  className,
}: {
  job: Job;
  matchId?: string;
  applicationStatus?: AppStatus;
  className?: string;
}) {
  const salary =
    job.salaryMin && job.salaryMax
      ? `$${(job.salaryMin / 1000).toFixed(0)}k–$${(job.salaryMax / 1000).toFixed(0)}k`
      : null;

  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-sm leading-snug">{job.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{job.company.name}</p>
          </div>
          <Badge variant={job.remote ? "default" : "secondary"} className="text-xs shrink-0">
            {job.remote ? "Remote" : (job.location ?? "On-site")}
          </Badge>
        </div>
      </CardHeader>

      <CardFooter className="text-xs text-muted-foreground flex items-center justify-between pt-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0">{JOB_TYPE_LABEL[job.type] ?? job.type}</span>
          {salary && <span className="shrink-0">{salary}</span>}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {matchId && applicationStatus && (
            <StatusPicker matchId={matchId} initialStatus={applicationStatus} />
          )}
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              Apply <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// Compact row variant used on the Applications page
export function JobRow({
  job,
  matchId,
  applicationStatus,
  applicationNote,
  appliedAt,
}: {
  job: Job;
  matchId: string;
  applicationStatus: AppStatus;
  applicationNote?: string | null;
  appliedAt?: Date | null;
}) {
  const cfg = STATUS_CONFIG[applicationStatus];

  return (
    <div className="flex items-center gap-4 py-3 border-b last:border-0">
      {/* Company + role */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug truncate">{job.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{job.company.name}</p>
        {applicationNote && (
          <p className="text-xs text-muted-foreground/70 mt-0.5 italic truncate">{applicationNote}</p>
        )}
      </div>

      {/* Applied date */}
      <div className="text-xs text-muted-foreground w-24 shrink-0 text-right">
        {appliedAt
          ? appliedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "—"}
      </div>

      {/* Status picker */}
      <div className="shrink-0">
        <StatusPicker matchId={matchId} initialStatus={applicationStatus} />
      </div>

      {/* Apply link */}
      {job.url && (
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}
