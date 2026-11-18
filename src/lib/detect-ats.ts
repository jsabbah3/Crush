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
  /** "site": the company's own website links to this board — strong evidence.
   *  "guess": a slug derived from the name/domain happened to exist — could be
   *  a different company with the same name; verify before trusting. */
  source: "site" | "guess";
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
    // Greenhouse and Ashby's posting-api both nest under `jobs`; Lever and
    // Gem return a bare array.
    const data: unknown = await res.json();
    const jobsLength = (): number | null => {
      if (typeof data !== "object" || data === null) return null;
      const value = (data as Record<string, unknown>).jobs;
      return Array.isArray(value) ? value.length : null;
    };

    if (type === "greenhouse") return jobsLength();
    if (type === "ashby")      return jobsLength();
    if (type === "lever")      return Array.isArray(data) ? data.length : null;
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

// Job-board links as they appear in careers pages: direct links, embeds.
const BOARD_LINKS: [AtsType, RegExp][] = [
  ["ashby", /jobs\.ashbyhq\.com\/([A-Za-z0-9._%-]+)/g],
  ["ashby", /ashbyhq\.com\/([A-Za-z0-9._%-]+)\/embed/g],
  ["greenhouse", /(?:job-boards|boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=)?([A-Za-z0-9_-]+)/g],
  ["lever", /jobs\.lever\.co\/([A-Za-z0-9._-]+)/g],
  ["gem", /jobs\.gem\.com\/([A-Za-z0-9._-]+)/g],
];
const NOT_SLUGS = new Set(["embed", "api", "v1", "js", "job_board", "job_app", "jobs", "posting-api"]);
const CAREER_PATHS = ["", "/careers", "/jobs", "/company/careers", "/about/careers", "/join"];
const CAREER_HREF = /href=["']([^"'#]*(?:career|jobs|join-us|hiring|work-with-us|open-roles)[^"'#]*)["']/gi;

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return "";
    const type = res.headers.get("content-type") ?? "";
    return type.includes("html") ? (await res.text()).slice(0, 2_000_000) : "";
  } catch {
    return "";
  }
}

/** Board links found in a page, most-mentioned first. */
export function boardLinks(html: string): { type: AtsType; slug: string }[] {
  const counts = new Map<string, number>();
  for (const [type, re] of BOARD_LINKS) {
    for (const m of html.matchAll(re)) {
      let slug: string;
      try { slug = decodeURIComponent(m[1]); } catch { slug = m[1]; }
      slug = slug.replace(/\/$/, "");
      if (!slug || NOT_SLUGS.has(slug.toLowerCase())) continue;
      const key = `${type}:${slug}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => {
      const i = key.indexOf(":");
      return { type: key.slice(0, i) as AtsType, slug: key.slice(i + 1) };
    });
}

/**
 * Find the board the company's own website links to: the homepage, the usual
 * careers paths, and any careers/jobs link on the homepage (which catches
 * careers.example.com and Notion/Webflow careers pages).
 */
export async function findBoardOnSite(website: string): Promise<AtsMatch | null> {
  let base: URL;
  try {
    base = new URL(website.startsWith("http") ? website : `https://${website}`);
  } catch {
    return null;
  }
  const origin = base.origin;
  const site = base.hostname.replace(/^www\./, "");
  const pages = await Promise.all(CAREER_PATHS.map((p) => fetchPage(`${origin}${p}`)));

  // Follow careers links from the homepage that stay on the company's domain.
  const extra = new Set<string>();
  for (const m of pages[0].matchAll(CAREER_HREF)) {
    try {
      const u = new URL(m[1], origin);
      const h = u.hostname.replace(/^www\./, "");
      if ((h === site || h.endsWith(`.${site}`)) && !CAREER_PATHS.some((p) => u.href === `${origin}${p}`)) extra.add(u.href);
    } catch { /* ignore */ }
  }
  pages.push(...(await Promise.all([...extra].slice(0, 3).map(fetchPage))));

  const stem = site.split(".")[0].replace(/[^a-z0-9]/g, "");
  const links = boardLinks(pages.join("\n"))
    // The company's own slug first, if the page links to several boards.
    .sort((a, b) => Number(b.slug.toLowerCase().replace(/[^a-z0-9]/g, "").includes(stem)) - Number(a.slug.toLowerCase().replace(/[^a-z0-9]/g, "").includes(stem)));
  for (const { type, slug } of links.slice(0, 5)) {
    const count = await probeAts(type, slug);
    if (count !== null && count > 0) return { type, slug, jobCount: count, source: "site" };
  }
  return null;
}

/**
 * The company's board: whatever its website links to, else the first slug
 * guess (from name / domain) that exists. Guesses can belong to a namesake —
 * callers should check the postings mention the company (see board-check).
 */
export async function detectAts(
  name: string,
  website?: string | null,
): Promise<AtsMatch | null> {
  if (website) {
    const onSite = await findBoardOnSite(website);
    if (onSite) return onSite;
  }
  const slugs = slugCandidates(name, website);
  const types: AtsType[] = ["ashby", "greenhouse", "lever", "gem"];

  for (const slug of slugs) {
    for (const type of types) {
      const count = await probeAts(type, slug);
      if (count !== null && count > 0) {
        return { type, slug, jobCount: count, source: "guess" };
      }
    }
  }
  return null;
}
