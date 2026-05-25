import { type IngestedJob, isRemoteLocation, normalizeJobType } from "./normalize";
import { normalizeCompanyName } from "./remotive";

type MuseJob = {
  id: number;
  name: string;
  type: string | null;
  publication_date: string | null;
  locations: Array<{ name: string }> | null;
  contents: string | null;
  refs: { landing_page: string } | null;
  company: { name: string } | null;
  levels: Array<{ name: string }> | null;
};

type MusePage = {
  results: MuseJob[];
  page_count: number;
};

const MAX_PAGES = 15;

// Returns jobs grouped by lowercased, normalised company name.
export async function fetchTheMuseJobs(): Promise<Map<string, IngestedJob[]>> {
  const byCompany = new Map<string, IngestedJob[]>();

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL("https://www.themuse.com/api/public/jobs");
    url.searchParams.set("page", page.toString());
    url.searchParams.set("descending", "true");

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) break;

    const data = await res.json() as MusePage;
    if (!data.results?.length) break;

    for (const job of data.results) {
      const key = normalizeCompanyName(job.company?.name);
      if (!key) continue;

      const location = job.locations?.[0]?.name ?? null;
      const entry: IngestedJob = {
        externalJobId: `muse-${job.id}`,
        title: job.name,
        description: job.contents ?? "",
        type: normalizeJobType(job.type),
        location,
        remote: isRemoteLocation(location),
        url: job.refs?.landing_page ?? null,
        postedAt: job.publication_date ? new Date(job.publication_date) : null,
      };

      const list = byCompany.get(key) ?? [];
      list.push(entry);
      byCompany.set(key, list);
    }

    if (page >= data.page_count - 1) break;
  }

  return byCompany;
}
