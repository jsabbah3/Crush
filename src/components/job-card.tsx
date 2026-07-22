"use client";

import { useRef, useState } from "react";
import { ExternalLink, Users, X } from "lucide-react";
import { toast } from "sonner";
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

async function setDismissedOnServer(matchId: string, dismissed: boolean) {
  await fetch("/api/matches", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matchId, dismissed }),
  });
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
  // "leaving" drives the exit animation; "gone" removes from layout after it.
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function dismiss() {
    if (!matchId) return;
    setLeaving(true);
    exitTimer.current = setTimeout(() => setGone(true), 240);
    void setDismissedOnServer(matchId, true);
    toast("Match dismissed", {
      action: {
        label: "Undo",
        onClick: () => {
          if (exitTimer.current) clearTimeout(exitTimer.current);
          setGone(false);
          setLeaving(false);
          void setDismissedOnServer(matchId, false);
        },
      },
    });
  }

  if (gone) return null;

  const salary =
    job.salaryMin && job.salaryMax
      ? `$${(job.salaryMin / 1000).toFixed(0)}k–$${(job.salaryMax / 1000).toFixed(0)}k`
      : null;

  const workMode = job.remote && job.location ? "Hybrid" : job.remote ? "Remote" : job.location;

  const status = (applicationStatus ?? "INTERESTED") as AppStatus;

  return (
    <div
      className={cn(
        "collapse-grid transition-opacity duration-[var(--dur-med)]",
        leaving && "opacity-0",
      )}
      data-collapsed={leaving || undefined}
    >
      <div>
        <div
          className={cn(
            "group relative rounded-lg border border-border/60 bg-card px-4 py-3.5",
            "transition-[border-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-settle)]",
            "hover:border-border hover:shadow-sm hover:-translate-y-px",
            className,
          )}
        >
          <div className="flex items-start gap-3">
            {!hideCompany && (
              <Link href={`/companies/${job.company.slug}`} className="shrink-0 mt-0.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
                <CompanyLogo name={job.company.name} website={job.company.website ?? null} size="sm" />
              </Link>
            )}
            <div className="min-w-0 flex-1">
              {!hideCompany && (
                <Link
                  href={`/companies/${job.company.slug}`}
                  className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  {job.company.name}
                </Link>
              )}
              {job.url ? (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-semibold text-[15px] leading-snug text-foreground hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  {job.title}
                </a>
              ) : (
                <p className="font-semibold text-[15px] leading-snug text-foreground">
                  {job.title}
                </p>
              )}
              <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums truncate">
                {salary && <span className="font-medium text-foreground">{salary}</span>}
                {salary && " · "}
                {JOB_TYPE_LABEL[job.type] ?? job.type}
                {workMode && <> · {workMode}</>}
                {job.postedAt && <> · {relativeTime(job.postedAt)}</>}
              </p>
              {(networkCount ?? 0) > 0 && (
                <Link
                  href={`/companies/${job.company.slug}#network`}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <Users className="size-3" />
                  {networkCount} in your network
                </Link>
              )}
            </div>
            {matchId && (
              <button
                onClick={dismiss}
                className="shrink-0 -mr-1 -mt-0.5 rounded-md p-1 text-muted-foreground/50 transition-colors hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                aria-label="Dismiss this match"
                title="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {(matchId || job.url) && (
            <div className="mt-2.5 flex items-center justify-between gap-2 pl-0.5">
              <div className="min-w-0">
                {matchId && (
                  <StatusPicker
                    matchId={matchId}
                    jobId={job.id}
                    initialStatus={status}
                  />
                )}
              </div>
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1 text-xs font-semibold text-foreground transition-colors hover:text-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  Apply <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
