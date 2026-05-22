"use client";

import { ExternalLink, X } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dismissMatch } from "@/app/actions/tracking";
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
  className,
}: {
  job: Job;
  matchId?: string;
  className?: string;
}) {
  const salary =
    job.salaryMin && job.salaryMax
      ? `$${(job.salaryMin / 1000).toFixed(0)}k – $${(job.salaryMax / 1000).toFixed(0)}k`
      : null;

  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-sm leading-snug">{job.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{job.company.name}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant={job.remote ? "default" : "secondary"} className="text-xs">
              {job.remote ? "Remote" : (job.location ?? "On-site")}
            </Badge>
            {matchId && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                onClick={() => dismissMatch(matchId)}
                title="Dismiss"
              >
                <X />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardFooter className="text-xs text-muted-foreground flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span>{JOB_TYPE_LABEL[job.type] ?? job.type}</span>
          {salary && <span>{salary}</span>}
        </div>
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
      </CardFooter>
    </Card>
  );
}
