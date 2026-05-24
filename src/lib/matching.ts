import type { Job } from "@/generated/prisma/client";

export function doesJobMatch(
  job: Job,
  roleTitles: string[],
  seniority: string[],
  remoteOnly: boolean | null,
  locationFilter: string | null,
): boolean {
  // Hard filters
  if (remoteOnly === true && !job.remote) return false;
  if (remoteOnly === false && job.remote) return false;
  if (locationFilter && !job.remote) {
    const loc = (job.location ?? "").toLowerCase();
    if (!loc.includes(locationFilter.toLowerCase())) return false;
  }

  // No role titles → any role passes (filtered only by remote/location above)
  if (roleTitles.length === 0) return true;

  const titleLower = job.title.toLowerCase();

  // Must match at least one role title
  if (!roleTitles.some((r) => titleLower.includes(r.toLowerCase()))) return false;

  // Seniority AND-filters the role match: if set, title must also contain one
  if (seniority.length > 0 && !seniority.some((s) => titleLower.includes(s.toLowerCase()))) {
    return false;
  }

  return true;
}
