import { type IngestedJob, isRemoteLocation, normalizeJobType } from "./normalize";

type AdzunaJob = {
  id: string;
  title: string;
  description: string | null;
  location: { display_name: string } | null;
  company: { display_name: string } | null;
  redirect_url: string | null;
  created: string | null;
  contract_time: string | null;
};

export async function fetchAdzunaJobs(companyName: string): Promise<IngestedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const apiKey = process.env.ADZUNA_API_KEY;
  if (!appId || !apiKey) throw new Error("ADZUNA_APP_ID / ADZUNA_API_KEY not set");

  const url = new URL("https://api.adzuna.com/v1/api/jobs/us/search/1");
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", apiKey);
  url.searchParams.set("company", companyName);
  url.searchParams.set("results_per_page", "50");
  url.searchParams.set("sort_by", "date");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Adzuna "${companyName}": HTTP ${res.status}`);

  const data = await res.json() as { results?: AdzunaJob[] };

  return (data.results ?? []).map((job) => {
    const location = job.location?.display_name ?? null;
    return {
      externalJobId: `adzuna-${job.id}`,
      title: job.title,
      description: job.description ?? "",
      type: normalizeJobType(job.contract_time),
      location,
      remote: isRemoteLocation(location),
      url: job.redirect_url ?? null,
      postedAt: job.created ? new Date(job.created) : null,
    };
  });
}
