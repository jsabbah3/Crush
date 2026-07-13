"use client";

import { useState } from "react";
import { ExternalLink, Users, X } from "lucide-react";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { StatusPicker, type AppStatus } from "@/components/status-picker";
import { CompanyLogo } from "@/components/company-logo";

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
  company: { name: string; slug: string; website?: string | null };
};

const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
};

function relativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function JobCard({
  job,
  matchId,
  applicationStatus,
  className,
  hideCompany = false,
  networkCount,
}: {
  job: Job;
  matchId?: string;
  applicationStatus?: string;
  className?: string;
  /** Skip the logo + company eyebrow — for lists already scoped to one company */
  hideCompany?: boolean;
  /** First-degree LinkedIn connections at this company — "who you know here" */
  networkCount?: number;
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

  const status = (applicationStatus ?? "INTERESTED") as AppStatus;

  return (
    <Card className={cn(
      "relative group gap-2 py-4 border-border/60 hover:border-border hover:shadow-sm transition-all duration-150",
      className
    )}>
      <CardHeader className="pb-0">
        <div className="flex items-start gap-3">
          {!hideCompany && (
            <Link href={`/companies/${job.company.slug}`} className="shrink-0 mt-0.5">
              <CompanyLogo name={job.company.name} website={job.company.website ?? null} size="sm" />
            </Link>
          )}
          <div className="min-w-0 flex-1 space-y-0.5">
            {!hideCompany && (
              <Link
                href={`/companies/${job.company.slug}`}
                className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground transition-colors"
              >
                {job.company.name}
              </Link>
            )}
            {job.url ? (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block font-semibold text-[15px] leading-snug text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors"
              >
                {job.title}
              </a>
            ) : (
              <p className="font-semibold text-[15px] leading-snug text-foreground">
                {job.title}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-1">
            <Badge
              variant="secondary"
              className={cn(
                "text-[11px] font-medium border",
                job.remote && !job.location
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : job.remote && job.location
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {job.remote && job.location ? "Hybrid" : job.remote ? "Remote" : "On-site"}
            </Badge>
            {matchId && (
              <button
                onClick={dismiss}
                className="text-muted-foreground/60 hover:text-muted-foreground transition-colors p-0.5 rounded"
                title="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardFooter className="text-xs text-muted-foreground flex items-center justify-between pt-0 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {matchId && (
            <StatusPicker
              matchId={matchId}
              jobId={job.id}
              initialStatus={status}
            />
          )}
          {!matchId && <span className="shrink-0">{JOB_TYPE_LABEL[job.type] ?? job.type}</span>}
          {salary && (
            <>
              <span className="text-border">·</span>
              <span className="shrink-0 font-medium text-foreground">{salary}</span>
            </>
          )}
          {job.postedAt && (
            <>
              <span className="text-border">·</span>
              <span className="shrink-0">{relativeTime(job.postedAt)}</span>
            </>
          )}
          {(networkCount ?? 0) > 0 && (
            <>
              <span className="text-border">·</span>
              <Link
                href={`/companies/${job.company.slug}#network`}
                className="flex items-center gap-1 shrink-0 font-medium text-primary hover:underline underline-offset-2"
              >
                <Users className="size-3" />
                {networkCount} in your network
              </Link>
            </>
          )}
        </div>
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-semibold text-foreground hover:text-muted-foreground transition-colors shrink-0"
          >
            Apply <ExternalLink className="size-3" />
          </a>
        )}
      </CardFooter>
    </Card>
  );
}
