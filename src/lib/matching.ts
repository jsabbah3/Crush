import type { Job } from "@/generated/prisma/client";

// Semantic role clusters — when a user tracks any title in a cluster,
// jobs matching any other title in that same cluster also qualify.
const ROLE_CLUSTERS: string[][] = [
  ["gtm engineer", "revenue engineer", "growth engineer", "sales engineer", "go-to-market engineer"],
  ["product manager", "product management", "pm ", " pm", "product lead", "program manager"],
  ["data scientist", "ml engineer", "machine learning engineer", "ai engineer", "data science"],
  ["data engineer", "analytics engineer", "data platform engineer"],
  ["frontend engineer", "front-end engineer", "frontend developer", "ui engineer", "react engineer", "web engineer"],
  ["backend engineer", "back-end engineer", "backend developer", "server engineer", "api engineer"],
  ["fullstack engineer", "full-stack engineer", "full stack engineer", "software engineer", "software developer", "swe"],
  ["devops engineer", "platform engineer", "infrastructure engineer", "site reliability engineer", "sre", "cloud engineer"],
  ["security engineer", "appsec engineer", "cybersecurity engineer", "infosec engineer"],
  ["mobile engineer", "ios engineer", "android engineer", "react native engineer", "flutter engineer"],
  ["designer", "ux designer", "ui designer", "product designer", "visual designer", "interaction designer"],
  ["marketing manager", "growth marketer", "demand generation", "demand gen", "performance marketer"],
  ["content marketer", "content writer", "content strategist", "copywriter"],
  ["recruiter", "talent acquisition", "technical recruiter", "sourcer"],
  ["customer success", "customer success manager", "csm", "account manager", "client success"],
  ["sales development", "sdr", "bdr", "business development representative", "sales development representative"],
  ["account executive", "ae ", " ae", "enterprise account executive", "commercial account executive"],
  ["solutions engineer", "solutions architect", "sales engineer", "technical account manager", "tam"],
  ["finance manager", "financial analyst", "fp&a", "financial planning"],
  ["operations manager", "biz ops", "business operations", "revenue operations", "revops"],
  ["chief of staff", "strategy & operations", "strategy and operations"],
  ["technical writer", "documentation engineer", "developer advocate", "developer relations", "devrel"],
];

// Seniority keywords mapped to canonical level
const SENIORITY_KEYWORDS: Record<string, string> = {
  "intern":     "intern",
  "internship": "intern",
  "junior":     "junior",
  "jr.":        "junior",
  "associate":  "junior",
  "entry level":"junior",
  "entry-level":"junior",
  "mid":        "mid",
  "mid-level":  "mid",
  "senior":     "senior",
  "sr.":        "senior",
  "sr ":        "senior",
  "staff":      "staff",
  "principal":  "principal",
  "lead":       "lead",
  "tech lead":  "lead",
  "director":   "director",
  "head of":    "director",
  "vp ":        "vp",
  "vice president": "vp",
  "c-level":    "executive",
  "cto":        "executive",
  "cpo":        "executive",
  "cmo":        "executive",
  "founder":    "executive",
};

export function detectSeniority(title: string, description?: string): string | null {
  const text = title.toLowerCase() + " " + (description ?? "").toLowerCase().slice(0, 500);
  for (const [keyword, level] of Object.entries(SENIORITY_KEYWORDS)) {
    if (text.includes(keyword)) return level;
  }
  return null;
}

// Expand a single role title into all semantically equivalent titles
function expandRole(role: string): string[] {
  const lower = role.toLowerCase();
  for (const cluster of ROLE_CLUSTERS) {
    if (cluster.some((term) => lower.includes(term) || term.includes(lower))) {
      return cluster;
    }
  }
  return [lower];
}

// Expand an array of role titles into all equivalent titles via clusters
export function expandRoleTitles(roles: string[]): string[] {
  const expanded = new Set<string>();
  for (const role of roles) {
    for (const variant of expandRole(role)) {
      expanded.add(variant);
    }
    expanded.add(role.toLowerCase());
  }
  return Array.from(expanded);
}

export function doesJobMatch(
  job: Job,
  roleTitles: string[],
  seniority: string[],
  remoteOnly: boolean | null,
  locationFilter: string | null,
): boolean {
  // Hard filters
  if (remoteOnly === true && !job.remote) return false;
  if (remoteOnly === false && job.remote) return false;
  if (locationFilter && !job.remote) {
    const loc = (job.location ?? "").toLowerCase();
    if (!loc.includes(locationFilter.toLowerCase())) return false;
  }

  // No role titles → any role passes (filtered only by remote/location above)
  if (roleTitles.length === 0) return true;

  const titleLower = job.title.toLowerCase();
  const expanded = expandRoleTitles(roleTitles);

  // Must match at least one role title (including semantic variants)
  if (!expanded.some((r) => titleLower.includes(r))) return false;

  // Seniority filter: if user specified levels, check title AND description
  if (seniority.length > 0) {
    const detectedLevel = detectSeniority(job.title, job.description);
    if (detectedLevel && !seniority.includes(detectedLevel)) return false;
    // If no seniority detected in job, don't exclude — benefit of the doubt
  }

  return true;
}
