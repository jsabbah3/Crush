import type { Job, TrackedCompany } from "@/generated/prisma/client";

export function doesJobMatch(job: Job, tracked: TrackedCompany): boolean {
  if (tracked.jobTypes.length > 0 && !tracked.jobTypes.includes(job.type)) {
    return false;
  }

  if (tracked.remoteOnly === true && !job.remote) return false;
  if (tracked.remoteOnly === false && job.remote) return false;

  if (tracked.locationFilter && !job.remote) {
    const loc = (job.location ?? "").toLowerCase();
    if (!loc.includes(tracked.locationFilter.toLowerCase())) return false;
  }

  if (tracked.keywords.length > 0) {
    const text = `${job.title} ${job.description}`.toLowerCase();
    const hasMatch = tracked.keywords.some((kw) =>
      text.includes(kw.toLowerCase())
    );
    if (!hasMatch) return false;
  }

  return true;
}
