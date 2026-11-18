/**
 * Is this job board really this company's?
 *
 * Boards are found by guessing slugs ("socket", "runway"), and a guess can
 * land on a namesake: Runway the video lab vs. Runway the planning tool.
 * Real boards almost always name the company somewhere in their postings
 * ("About Runway…"), so: does any posting mention the company's name or
 * its domain?
 */

import { detectAts, type AtsMatch } from "@/lib/detect-ats";
import { fetchAtsJobs } from "@/lib/ingestion";

const SUFFIX = /(?:[\s.,-]+(?:ai|labs?|inc|hq|app|io|co|corp|technologies|tech|health|robotics|security|bio|data|software|systems))+$/i;

/** Ways a posting might refer to the company: "Recall AI" → recall ai, recall. */
export function nameVariants(name: string, website?: string | null): string[] {
  const n = name.toLowerCase().replace(/’/g, "'").trim();
  const out = new Set([n, n.replace(SUFFIX, "").trim(), n.replace(/[^a-z0-9]/g, "")]);
  if (website) {
    try {
      const host = new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, "");
      const stem = host.split(".")[0].replace(/^(?:try|use|get|join|with|go|meet|hey)(?=[a-z]{4})/, "");
      out.add(stem);
      out.add(host);
    } catch { /* ignore */ }
  }
  return [...out].filter((v) => v.length >= 3);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function mentionsCompany(
  name: string,
  website: string | null | undefined,
  jobs: { title: string; description: string | null }[],
  sample = 15,
): boolean {
  const res = nameVariants(name, website).map((v) => new RegExp(`(?<![a-z0-9])${escape(v)}(?![a-z0-9])`, "i"));
  return jobs.slice(0, sample).some((j) => {
    const text = `${j.title} ${j.description ?? ""}`.replace(/’/g, "'");
    return res.some((re) => re.test(text));
  });
}

/**
 * detectAts, plus the namesake check for slug guesses: a board the company's
 * website links to is taken as is; a guessed one only if its postings name
 * the company.
 */
export async function findCompanyBoard(name: string, website?: string | null): Promise<AtsMatch | null> {
  const match = await detectAts(name, website);
  if (!match || match.source === "site") return match;
  const jobs = await fetchAtsJobs(match.type, match.slug).catch(() => []);
  return mentionsCompany(name, website, jobs) ? match : null;
}
