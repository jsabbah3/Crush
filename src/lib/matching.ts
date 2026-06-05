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

// Seniority keywords mapped to canonical level.
// Order matters — more specific terms first to avoid partial-match conflicts.
const SENIORITY_KEYWORDS: Record<string, string> = {
  // Executive
  "c-level":        "executive",
  "cto":            "executive",
  "cpo":            "executive",
  "cmo":            "executive",
  "coo":            "executive",
  "chief ":         "executive",
  "founder":        "executive",

  // VP
  "vice president":  "vp",
  "vp of":           "vp",
  "vp, ":            "vp",

  // Director
  "director":        "director",
  "head of":         "director",

  // Staff / Principal
  "staff ":          "staff",
  "principal ":      "principal",

  // Senior — explicit + sales territory signals
  "senior":          "senior",
  "sr.":             "senior",
  "sr ":             "senior",
  "tech lead":       "lead",
  "lead ":           "lead",
  "enterprise":      "senior",   // Enterprise AE = senior territory
  "strategic":       "senior",   // Strategic AE = senior territory
  "national":        "senior",
  "global":          "senior",

  // Senior — CS & recruiting segment signals (mirrors enterprise AE logic)
  "named ":          "senior",   // Named Account CSM = strategic/senior territory
  "hrbp":            "senior",   // HR Business Partner = senior HR role
  "hr business partner": "senior",
  "business partner":    "senior",  // Finance/HR/People Business Partner

  // Mid
  "mid-level":       "mid",
  "mid level":       "mid",
  "mid market":      "mid",      // Mid Market AE/CSM = mid territory
  "mid-market":      "mid",
  "commercial":      "mid",      // Commercial AE/CSM = mid territory
  "velocity":        "mid",      // Velocity CSM = mid-tier, higher-volume accounts

  // Junior / early career (universal + role-specific)
  "junior":          "junior",
  "jr.":             "junior",
  "jr ":             "junior",
  "associate ":      "junior",   // Associate SWE, Associate PM, Associate Designer etc.
  "entry level":     "junior",
  "entry-level":     "junior",
  "new grad":        "junior",
  "new graduate":    "junior",
  "early career":    "junior",
  "graduate ":       "junior",
  "coordinator":     "junior",   // Marketing/Ops/Recruiting/HR Coordinator — universally junior
  "sourcer":         "junior",   // Sourcer in recruiting = entry-level
  "smb":             "junior",   // SMB AE/CSM = entry/junior territory
  "tech touch":      "junior",   // Tech Touch/Digital Success CSM = low-touch, high-volume
  "digital success": "junior",   // Digital Customer Success = low-touch/scale segment

  // Intern
  "intern":          "intern",
  "internship":      "intern",
  "co-op":           "intern",
  "coop":            "intern",
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
  if (locationFilter) {
    const loc = (job.location ?? "").toLowerCase();
    const filter = locationFilter.toLowerCase();
    // For remote jobs: only filter if a location is specified on the job
    // (blank location on a remote job = "anywhere" — don't exclude it)
    if (loc && !loc.includes(filter)) return false;
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
    if (detectedLevel) {
      if (!seniority.includes(detectedLevel)) return false;
    } else {
      // No seniority detected — benefit of the doubt for most roles,
      // but senior+ users should not see roles that are clearly scoped
      // below their level even if we couldn't parse the exact keyword.
      // This catches patterns like "Level I", "I (", "- I " in titles.
      const isSeniorUser = seniority.some((s) =>
        ["senior", "staff", "principal", "lead", "director", "vp", "executive"].includes(s)
      );
      if (isSeniorUser) {
        const t = job.title.toLowerCase();
        // Exclude obvious junior-tier patterns not caught by keyword map
        const juniorPatterns = [/ i$/, / i /, /\(i\)/, /level i\b/, /- i$/, /grade [1-2]\b/];
        if (juniorPatterns.some((p) => p.test(t))) return false;
      }
    }
  }

  return true;
}
