import type { Job, TrackedCompany } from "@/generated/prisma/client";

export function doesJobMatch(
  job: Job,
  tracked: TrackedCompany,
  trackedRoleTitles: string[] = []
): boolean {
  // Hard filters — must all pass
  if (tracked.jobTypes.length > 0 && !tracked.jobTypes.includes(job.type)) {
    return false;
  }
  if (tracked.remoteOnly === true && !job.remote) return false;
  if (tracked.remoteOnly === false && job.remote) return false;
  if (tracked.locationFilter && !job.remote) {
    const loc = (job.location ?? "").toLowerCase();
    if (!loc.includes(tracked.locationFilter.toLowerCase())) return false;
  }

  // Soft filters (OR): if none set, everything passes; otherwise at least one must match
  const hasKeywords = tracked.keywords.length > 0;
  const hasRoles = trackedRoleTitles.length > 0;
  if (!hasKeywords && !hasRoles) return true;

  const titleLower = job.title.toLowerCase();
  const text = `${titleLower} ${job.description.toLowerCase()}`;

  // Keywords match title + description (broader)
  if (hasKeywords && tracked.keywords.some((kw) => text.includes(kw.toLowerCase()))) {
    return true;
  }

  // Role titles match job title only (more precise)
  if (hasRoles && trackedRoleTitles.some((role) => titleLower.includes(role.toLowerCase()))) {
    return true;
  }

  return false;
}
