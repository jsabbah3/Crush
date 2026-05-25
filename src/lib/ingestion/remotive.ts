import { type IngestedJob, normalizeJobType } from "./normalize";

type RemotiveJob = {
  id: number;
  url: string | null;
  title: string;
  company_name: string;
  job_type: string | null;
  publication_date: string | null;
  candidate_required_location: string | null;
  description: string | null;
};

// Returns jobs grouped by lowercased, normalised company name.
export async function fetchRemotiveJobs(): Promise<Map<string, IngestedJob[]>> {
  const res = await fetch("https://remotive.com/api/remote-jobs", {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Remotive: HTTP ${res.status}`);

  const data = await res.json() as { jobs?: RemotiveJob[] };
  const byCompany = new Map<string, IngestedJob[]>();

  for (const job of data.jobs ?? []) {
    const key = normalizeCompanyName(job.company_name);
    if (!key) continue;

    const entry: IngestedJob = {
      externalJobId: `remotive-${job.id}`,
      title: job.title,
      description: job.description ?? "",
      type: normalizeJobType(job.job_type),
      location: job.candidate_required_location ?? null,
      remote: true,
      url: job.url ?? null,
      postedAt: job.publication_date ? new Date(job.publication_date) : null,
    };

    const list = byCompany.get(key) ?? [];
    list.push(entry);
    byCompany.set(key, list);
  }

  return byCompany;
}

export function normalizeCompanyName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[,.]?\s*(inc\.?|llc\.?|ltd\.?|corp\.?|co\.?|plc\.?)(\s|$)/gi, "")
    .trim();
}
