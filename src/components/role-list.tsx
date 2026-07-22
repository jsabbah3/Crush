import { ExternalLink } from "lucide-react";
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
      {/* amber tick — scales in on hover/focus */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-1/2 hidden h-[60%] w-0.5 -translate-y-1/2 origin-center scale-y-0 rounded-full bg-primary transition-transform duration-[var(--dur-med)] ease-[var(--ease-settle)] group-hover/role:scale-y-100 group-focus-visible/role:scale-y-100 sm:block"
      />
      <div className="min-w-0">
        <p className="font-medium text-[15px] leading-snug tracking-[-0.008em] text-foreground transition-colors group-hover/role:text-primary group-focus-visible/role:text-primary">
          {job.title}
          {workMode && (
            <span className="font-normal italic text-muted-foreground"> · {workMode}</span>
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
            <span>{relativeTime(job.postedAt)}</span>
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
 * "Quiet Paper" open-roles list: set typographic lines rather than cards.
 * Hover/focus indents the row and draws a 2px amber tick, and reveals Apply.
 * The whole row is the apply link when a URL exists.
 */
export function RoleList({ jobs }: { jobs: Job[] }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {jobs.map((job) => (
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
  );
}
