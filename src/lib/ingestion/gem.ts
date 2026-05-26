import { type IngestedJob, isRemoteLocation, isUSOrRemote, normalizeJobType } from "./normalize";

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

  const data = await res.json() as GemResponse;
  const jobs = data.job_posts ?? [];

  return jobs
    .filter((p) => {
      // Gem uses location_type: "remote" — treat that as remote regardless of location text
      if (p.location_type === "remote") return true;
      return isUSOrRemote(p.location?.name ?? null);
    })
    .map((p) => {
      const locationName = p.location?.name ?? null;
      const remote = p.location_type === "remote" || isRemoteLocation(locationName);
      return {
        externalJobId: p.id,
        title: p.title,
        description: p.content ?? p.content_plain ?? "",
        type: normalizeJobType(p.employment_type),
        location: locationName,
        remote,
        url: p.absolute_url ?? null,
        postedAt: p.first_published_at
          ? new Date(p.first_published_at)
          : p.created_at
            ? new Date(p.created_at)
            : null,
      };
    });
}
