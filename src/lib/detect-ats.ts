/**
 * ATS auto-detection utility.
 * Given a company name + optional website, probes Greenhouse / Lever / Ashby / Gem
 * and returns the first match found.
 */

const TIMEOUT_MS = 6000;

export type AtsType = "greenhouse" | "lever" | "ashby" | "gem";

export type AtsMatch = {
  type: AtsType;
  slug: string;
  jobCount: number;
};

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function probeAts(type: AtsType, slug: string): Promise<number | null> {
  try {
    const urls: Record<AtsType, string> = {
      greenhouse: `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
      lever:      `https://api.lever.co/v0/postings/${slug}?mode=json`,
      ashby:      `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
      gem:        `https://api.gem.com/job_board/v0/${encodeURIComponent(slug)}/job_posts/`,
    };
    const res = await fetchWithTimeout(urls[type]);
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (type === "greenhouse") return Array.isArray(data.jobs) ? data.jobs.length : null;
    if (type === "lever")      return Array.isArray(data) ? data.length : null;
    if (type === "ashby")      return Array.isArray(data.jobs) ? data.jobs.length : null;
    if (type === "gem")        return Array.isArray(data) ? data.length : null;
    return null;
  } catch {
    return null;
  }
}

/** Derive slug candidates from a company name and/or website URL */
export function slugCandidates(name: string, website?: string | null): string[] {
  const candidates = new Set<string>();

  // From name
  const lower = name.toLowerCase();
  candidates.add(lower.replace(/[^a-z0-9]/g, ""));           // "acmecorp"
  candidates.add(lower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); // "acme-corp"
  candidates.add(lower.replace(/[^a-z0-9]+/g, "").slice(0, 20));

  // From website domain
  if (website) {
    try {
      const host = new URL(website.startsWith("http") ? website : `https://${website}`).hostname;
      const domain = host.replace(/^www\./, "").split(".")[0]; // "acme" from "www.acme.io"
      candidates.add(domain);
      candidates.add(domain.replace(/-/g, ""));
    } catch {
      // ignore bad URLs
    }
  }

  return [...candidates].filter(Boolean);
}

/** Probe all ATS types with all slug candidates, return first match */
export async function detectAts(
  name: string,
  website?: string | null,
): Promise<AtsMatch | null> {
  const slugs = slugCandidates(name, website);
  const types: AtsType[] = ["ashby", "greenhouse", "lever", "gem"];

  for (const slug of slugs) {
    for (const type of types) {
      const count = await probeAts(type, slug);
      if (count !== null && count > 0) {
        return { type, slug, jobCount: count };
      }
    }
  }
  return null;
}
