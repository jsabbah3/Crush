import { type IngestedJob, isRemoteLocation, normalizeJobType } from "./normalize";

type LeverPosting = {
  id: string;
  text: string;
  description: string | null;
  descriptionPlain: string | null;
  hostedUrl: string | null;
  applyUrl: string | null;
  categories: {
    location?: string;
    commitment?: string;
    team?: string;
    department?: string;
  } | null;
  createdAt: number | null;
};

export async function fetchLeverJobs(slug: string): Promise<IngestedJob[]> {
  const res = await fetch(
    `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,
    { next: { revalidate: 0 } }
  );

  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Lever ${slug}: HTTP ${res.status}`);

  const postings = await res.json() as LeverPosting[];

  return postings.map((p) => {
    const location = p.categories?.location ?? null;
    return {
      externalJobId: p.id,
      title: p.text,
      description: p.description ?? p.descriptionPlain ?? "",
      type: normalizeJobType(p.categories?.commitment),
      location,
      remote: isRemoteLocation(location),
      url: p.hostedUrl ?? p.applyUrl ?? null,
      postedAt: p.createdAt ? new Date(p.createdAt) : null,
    };
  });
}
