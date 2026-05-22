import { type IngestedJob, isRemoteLocation, normalizeJobType } from "./normalize";

type AshbyJob = {
  id: string;
  title: string;
  location: string | null;
  isRemote: boolean | null;
  publishedAt: string | null;
  descriptionHtml: string | null;
  jobUrl: string | null;
  employmentType: string | null;
};

type AshbyResponse = {
  jobs: AshbyJob[];
};

export async function fetchAshbyJobs(slug: string): Promise<IngestedJob[]> {
  const res = await fetch(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`,
    { next: { revalidate: 0 } }
  );

  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Ashby ${slug}: HTTP ${res.status}`);

  const data = await res.json() as AshbyResponse;

  return (data.jobs ?? []).map((p) => ({
    externalJobId: p.id,
    title: p.title,
    description: p.descriptionHtml ?? "",
    type: normalizeJobType(p.employmentType),
    location: p.location ?? null,
    remote: p.isRemote ?? isRemoteLocation(p.location),
    url: p.jobUrl ?? null,
    postedAt: p.publishedAt ? new Date(p.publishedAt) : null,
  }));
}
