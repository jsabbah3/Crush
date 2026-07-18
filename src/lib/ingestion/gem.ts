import { type IngestedJob, isRemoteLocation, isUSOrRemote, normalizeJobType, parseSalary } from "./normalize";

type GemJob = {
  id: string;
  title: string;
  location: { name: string } | null;
  location_type: string | null; // "remote" | "hybrid" | "in_office"
  employment_type: string | null;
  absolute_url: string | null;
  first_published_at: string | null;
  created_at: string | null;
  content: string | null;
  content_plain: string | null;
};

type GemResponse = {
  job_posts: GemJob[];
};

export async function fetchGemJobs(slug: string): Promise<IngestedJob[]> {
  const res = await fetch(
    `https://api.gem.com/job_board/v0/${encodeURIComponent(slug)}/job_posts/`,
    { next: { revalidate: 0 } }
  );

  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Gem ${slug}: HTTP ${res.status}`);

  // Gem's job board API returns a top-level array of job posts. (It was
  // being read as { job_posts: [...] }, so every gem company silently
  // ingested 0 jobs.) Handle both shapes defensively.
  const data = await res.json() as GemJob[] | GemResponse;
  const jobs = Array.isArray(data) ? data : (data.job_posts ?? []);

  return jobs
    .filter((p) => {
      // Gem uses location_type: "remote" — treat that as remote regardless of location text
      if (p.location_type === "remote") return true;
      return isUSOrRemote(p.location?.name ?? null);
    })
    .map((p) => {
      const locationName = p.location?.name ?? null;
      const remote = p.location_type === "remote" || isRemoteLocation(locationName);
      const description = p.content ?? p.content_plain ?? "";
      const salary = parseSalary(description);
      return {
        externalJobId: p.id,
        title: p.title,
        description,
        type: normalizeJobType(p.employment_type),
        location: locationName,
        remote,
        url: p.absolute_url ?? null,
        postedAt: p.first_published_at
          ? new Date(p.first_published_at)
          : p.created_at
            ? new Date(p.created_at)
            : null,
        salaryMin: salary?.min ?? null,
        salaryMax: salary?.max ?? null,
        currency: salary?.currency ?? "USD",
      };
    });
}
