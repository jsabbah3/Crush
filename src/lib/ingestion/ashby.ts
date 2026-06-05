import { type IngestedJob, isRemoteLocation, isUSOrRemote, normalizeJobType, parseSalary } from "./normalize";

type AshbyJob = {
  id: string;
  title: string;
  location: string | null;
  isRemote: boolean | null;
  publishedAt: string | null;
  descriptionHtml: string | null;
  jobUrl: string | null;
  employmentType: string | null;
  // Structured compensation (only present when company opts into pay transparency)
  compensation?: {
    summaryComponents?: Array<{
      compensationTierSummary?: string;
      minValue?: number;
      maxValue?: number;
      currencyCode?: string;
      interval?: string; // "Year" | "Month" | "Hour" etc.
    }>;
  };
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

  return (data.jobs ?? []).filter((p) => isUSOrRemote(p.location)).map((p) => {
    const description = p.descriptionHtml ?? "";

    // Prefer structured compensation if company has opted into pay transparency
    const comp = p.compensation?.summaryComponents?.[0];
    let salaryMin: number | null = null;
    let salaryMax: number | null = null;
    let currency = "USD";

    if (comp?.minValue && comp?.maxValue && comp?.interval === "Year") {
      salaryMin = Math.round(comp.minValue);
      salaryMax = Math.round(comp.maxValue);
      currency = comp.currencyCode ?? "USD";
    } else {
      // Fall back to parsing description text
      const parsed = parseSalary(description);
      salaryMin = parsed?.min ?? null;
      salaryMax = parsed?.max ?? null;
      currency = parsed?.currency ?? "USD";
    }

    return {
      externalJobId: p.id,
      title: p.title,
      description,
      type: normalizeJobType(p.employmentType),
      location: p.location ?? null,
      remote: p.isRemote ?? isRemoteLocation(p.location),
      url: p.jobUrl ?? null,
      postedAt: p.publishedAt ? new Date(p.publishedAt) : null,
      salaryMin,
      salaryMax,
      currency,
    };
  });
}
