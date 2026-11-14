"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Job = {
  id: string;
  title: string;
  type: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  url: string | null;
  postedAt: Date | null;
};

const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
};

const PAGE = 25;
// Below this, a filter box is more furniture than the list it filters.
const FILTER_FROM = 12;

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

function isFresh(date: Date | null): boolean {
  return !!date && Date.now() - new Date(date).getTime() < 3 * 86400000;
}

function RoleRow({ job }: { job: Job }) {
  const salary =
    job.salaryMin && job.salaryMax
      ? `$${(job.salaryMin / 1000).toFixed(0)}k–$${(job.salaryMax / 1000).toFixed(0)}k`
      : null;
  const workMode = job.remote && job.location ? "Hybrid" : job.remote ? "Remote" : job.location;

  return (
    <div
      className={cn(
        "relative grid grid-cols-1 gap-1 py-3.5 pr-1 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6",
        "transition-[padding] duration-[var(--dur-med)] ease-[var(--ease-settle)]",
        job.url && "sm:group-hover/role:pl-3.5 sm:group-focus-visible/role:pl-3.5",
      )}
    >
      {/* red tick — scales in on hover/focus */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-1/2 hidden h-[60%] w-[3px] -translate-y-1/2 origin-center scale-y-0 bg-primary transition-transform duration-[var(--dur-med)] ease-[var(--ease-settle)] group-hover/role:scale-y-100 group-focus-visible/role:scale-y-100 sm:block"
      />
      <div className="min-w-0">
        <p className="text-[15px] font-semibold leading-snug tracking-[-0.008em] text-foreground transition-colors group-hover/role:text-primary group-focus-visible/role:text-primary">
          {job.title}
          {workMode && (
            <span className="font-normal text-muted-foreground"> · {workMode}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground tabular-nums">
        {salary && <span className="font-medium text-foreground/80">{salary}</span>}
        {salary && <span aria-hidden>·</span>}
        <span>{JOB_TYPE_LABEL[job.type] ?? job.type}</span>
        {job.postedAt && (
          <>
            <span aria-hidden>·</span>
            <span className={cn(isFresh(job.postedAt) && "font-semibold text-primary")}>
              {relativeTime(job.postedAt)}
            </span>
          </>
        )}
        {job.url && (
          <span className="ml-1 hidden items-center gap-0.5 font-sans font-semibold text-primary opacity-0 transition-opacity duration-[var(--dur-fast)] group-hover/role:opacity-100 group-focus-visible/role:opacity-100 sm:inline-flex">
            Apply <ExternalLink className="size-3" />
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * A company's open roles as set lines of type rather than cards. Hover/focus
 * indents the row, draws a red tick, and reveals Apply; the whole row is the
 * apply link when a URL exists.
 *
 * Long boards get a title filter and a "show more" — someone landing on a
 * company with 150 openings is looking for one of them, not a scroll.
 */
export function RoleList({ jobs, total }: { jobs: Job[]; total?: number }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);

  const filtered = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return jobs;
    return jobs.filter((j) => {
      const hay = `${j.title} ${j.location ?? ""} ${j.remote ? "remote" : ""}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [jobs, q]);

  const visible = filtered.slice(0, shown);

  return (
    <div className="space-y-3">
      {jobs.length >= FILTER_FROM && (
        <label className="flex items-center gap-2 border border-foreground/25 bg-paper px-3 focus-within:border-graphite focus-within:ring-3 focus-within:ring-graphite/25">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShown(PAGE);
            }}
            placeholder={`Find your role in ${jobs.length}… try “account executive” or “remote”`}
            aria-label="Filter open roles"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {q && (
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              {filtered.length} of {jobs.length}
            </span>
          )}
        </label>
      )}

      {filtered.length === 0 ? (
        <p className="border-y border-dashed border-foreground/20 py-8 text-center text-sm text-muted-foreground">
          Nothing open with that in the title. Clear the filter, or follow the company and we&apos;ll email you when one does.
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-foreground/20">
          {visible.map((job) => (
            <li key={job.id}>
              {job.url ? (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/role block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset"
                >
                  <RoleRow job={job} />
                </a>
              ) : (
                <div className="group/role">
                  <RoleRow job={job} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {total !== undefined && total > jobs.length && (
        <p className="font-mono text-xs text-muted-foreground">
          Showing the {jobs.length} newest of {total.toLocaleString()} open roles.
        </p>
      )}

      {filtered.length > shown && (
        <button
          onClick={() => setShown((n) => n + PAGE * 2)}
          className="cursor-pointer text-sm font-semibold underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
        >
          Show more — {filtered.length - shown} to go
        </button>
      )}
    </div>
  );
}
