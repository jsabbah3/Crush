"use client";

import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  applicationStatus: _applicationStatus,
  className,
}: {
  job: Job;
  matchId?: string;
  applicationStatus?: string;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  async function dismiss() {
    if (!matchId) return;
    setDismissed(true);
    await fetch("/api/matches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, dismissed: true }),
    });
  }

  if (dismissed) return null;

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
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={job.remote ? "default" : "secondary"} className="text-xs">
              {job.remote ? "Remote" : (job.location ?? "On-site")}
            </Badge>
            {matchId && (
              <button
                onClick={dismiss}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardFooter className="text-xs text-muted-foreground flex items-center justify-between pt-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0">{JOB_TYPE_LABEL[job.type] ?? job.type}</span>
          {salary && <span className="shrink-0">{salary}</span>}
        </div>
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
          >
            Apply <ExternalLink className="size-3" />
          </a>
        )}
      </CardFooter>
    </Card>
  );
}
