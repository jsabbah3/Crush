import type { Job } from "@/generated/prisma/client";
import { locationOk } from "@/lib/location";

// ── Role vocabulary ────────────────────────────────────────────────────────
//
// SYNONYMS are true equivalents — any one of them stands for the others
// ("SWE" = "software engineer"). Matching is two-way.
//
// FAMILIES are a broad role over its specific ones. Tracking the broad role
// ("mobile engineer") matches the specific ones (iOS, Android); tracking a
// specific one ("iOS engineer") does NOT pull in its siblings. The old
// cluster list was symmetric, so "iOS engineer" matched every Android role
// and "Product" matched Technical Program Manager.
const SYNONYMS: string[][] = [
  ["software engineer", "software developer", "swe"],
  ["frontend engineer", "front-end engineer", "front end engineer", "frontend developer", "front-end developer"],
  ["backend engineer", "back-end engineer", "back end engineer", "backend developer", "back-end developer"],
  ["fullstack engineer", "full-stack engineer", "full stack engineer", "fullstack developer", "full-stack developer"],
  ["site reliability engineer", "sre"],
  ["machine learning engineer", "ml engineer"],
  ["gtm engineer", "go-to-market engineer"],
  ["product manager", "pm"],
  ["account executive", "ae"],
  ["sales development representative", "sales development rep", "sdr", "business development representative", "bdr"],
  ["customer success manager", "csm"],
  ["technical account manager", "tam"],
  ["solutions engineer", "sales engineer", "pre-sales engineer", "presales engineer"],
  ["revenue operations", "revops", "rev ops"],
  ["business operations", "bizops", "biz ops"],
  ["strategy & operations", "strategy and operations", "strategy & ops", "strategy and ops"],
  ["financial planning & analysis", "fp&a", "financial planning and analysis"],
  ["developer relations", "devrel", "developer advocate"],
  ["recruiter", "talent acquisition"],
  ["demand generation", "demand gen"],
  ["ux designer", "user experience designer"],
];

const FAMILIES: Record<string, string[]> = {
  "mobile engineer": ["ios engineer", "android engineer", "react native engineer", "flutter engineer", "mobile developer"],
  "data scientist": ["machine learning scientist", "applied scientist"],
  "designer": ["product designer", "ux designer", "ui designer", "visual designer", "interaction designer"],
  "finance": ["financial analyst", "fp&a", "financial planning & analysis", "controller", "accountant", "accounting", "treasury"],
  "operations": ["business operations", "revenue operations", "strategy & operations"],
  "sales": ["account executive", "sales development representative", "account manager"],
  "customer success": ["customer success manager"],
  "marketing": ["product marketing", "growth marketing", "demand generation", "content marketing"],
  "partnerships": ["partner manager", "partner development manager", "partner development", "channel partner manager", "channel manager", "alliances manager", "alliance manager", "strategic alliances"],
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function synonymsOf(term: string): string[] {
  for (const group of SYNONYMS) if (group.includes(term)) return group;
  return [term];
}

// Expand a tracked role into every phrase that counts as that role.
function expandRole(role: string): string[] {
  const r = norm(role);
  const out = new Set<string>(synonymsOf(r));
  // A broad role also covers its specific members (and their synonyms).
  const family = FAMILIES[r] ?? FAMILIES[`${r}s`] ?? FAMILIES[r.replace(/s$/, "")] ?? [];
  for (const member of family) for (const s of synonymsOf(member)) out.add(s);
  // A role that contains a known phrase gets that phrase swapped for each of
  // its synonyms, in place: "Enterprise AE" ⇄ "Enterprise Account Executive".
  // (Not widened to the bare synonym — "Enterprise AE" must not match every AE.)
  for (const group of SYNONYMS) {
    for (const t of group) {
      if (r === t) continue;
      const re = new RegExp(`(?<![a-z0-9])${escapeRe(t)}(?![a-z0-9])`, "i");
      if (re.test(r)) for (const g of group) if (g !== t) out.add(r.replace(re, g));
    }
  }
  return [...out];
}

/** Every phrase a user's roles stand for. Also used as a cheap SQL pre-filter. */
export function expandRoleTitles(roles: string[]): string[] {
  const out = new Set<string>();
  for (const role of roles) for (const v of expandRole(role)) out.add(v);
  return [...out];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word, case-insensitive phrase match; singular and plural both count. */
function hasPhrase(text: string, phrase: string): boolean {
  const stem = phrase.replace(/(?<=[a-z]{3})s$/, "");
  return new RegExp(`(?<![a-z0-9])${escapeRe(stem)}(?:s|es)?(?![a-z0-9])`, "i").test(text);
}

// Titles are "<role>, <team/specialty>" or "<role> - <specialty>". The role
// is what the job IS; the rest is what it's ABOUT. "Account Executive,
// Startups" is an AE job, not a startup job.
const SEGMENT_SPLIT = /\s*(?:,|\s[-–—]|[-–—]\s|[|:()])\s*/;

// Heads that name only a level or a generic function — "Manager, Strategic
// Partnerships", "Software Engineer, iOS" — so the next segment is the role.
const GENERIC_HEADS = new Set([
  "manager", "senior manager", "director", "head", "lead", "head of", "associate", "senior associate",
  "specialist", "analyst",
]);
// Generic engineering heads: the specialty can sit anywhere after them
// ("Software Engineer, Mobile Platform (iOS)").
const ENGINEERING_HEADS = new Set(["engineer", "software engineer", "developer", "software developer"]);
const LEVEL_ONLY = /^(?:senior|sr\.?|staff|principal|junior|jr\.?|[ivx]+|\d+)$/;

/** The part of a title that says what the job is. */
function titleCore(title: string): string {
  const segs = title.toLowerCase().split(SEGMENT_SPLIT).map((x) => x.trim()).filter(Boolean);
  if (segs.length === 0) return "";
  const bareHead = segs[0].split(" ").filter((w) => !LEVEL_ONLY.test(w)).join(" ");
  if (ENGINEERING_HEADS.has(bareHead)) return segs.join(" ");
  return GENERIC_HEADS.has(bareHead) && segs[1] ? `${segs[0]} ${segs[1]}` : segs[0];
}

// "Manager, Account Executives" / "Head of Recruiters" manages people in the
// role rather than doing it.
function managesTheRole(title: string, phrase: string): boolean {
  // Only person-nouns can be managed: "Manager, Account Executives" yes,
  // "Manager, Strategic Partnerships" no.
  if (!/(?:er|or|ist|yst|ive|ant|ae|sdr|bdr|csm)s?$/.test(phrase)) return false;
  const stem = escapeRe(phrase.replace(/(?<=[a-z]{3})s$/, ""));
  return new RegExp(`\\b(?:manager|director|head|lead)(?:,|\\s+of)\\s+(?:[a-z&-]+\\s+){0,2}${stem}s\\b`, "i").test(title);
}

const MANAGER_ROLE = /\b(?:manager|director|head|lead|vp|chief)\b/;

/** Does this job title count as one of the user's roles? */
export function titleMatchesRoles(title: string, roleTitles: string[]): boolean {
  const core = titleCore(title);
  const wantsManager = roleTitles.some((r) => MANAGER_ROLE.test(r.toLowerCase()));
  const wantsIntern = roleTitles.some((r) => /\bintern/.test(r.toLowerCase()));
  if (!wantsIntern && /\b(?:intern|internship|co-op)\b/i.test(title)) return false;

  for (const role of roleTitles) {
    for (const phrase of expandRole(role)) {
      if (phrase.length < 2) continue;
      // Multi-word phrases are specific enough to count anywhere in the
      // title; single words ("Product", "Startup", "iOS") only in its core.
      const where = phrase.includes(" ") ? title : core;
      if (!hasPhrase(where, phrase)) continue;
      if (!wantsManager && managesTheRole(title, phrase)) continue;
      return true;
    }
  }
  return false;
}

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

// Territory/segment words ("Enterprise AE", "Commercial CSM") only signal
// seniority when they appear in the TITLE. In descriptions they're generic
// prose ("our enterprise customers", "we're a global company") and were
// causing false seniority classification on otherwise-unleveled roles.
const TITLE_ONLY_KEYWORDS = new Set([
  "enterprise", "strategic", "national", "global", "named ",
  "business partner", "mid market", "mid-market", "commercial", "velocity",
  "digital success",
]);

// Descriptions are prose: "reports to our Chief Financial Officer", "work
// with senior leaders", "internal tools". Only a few phrases there are
// unambiguous about the role's own level.
const DESCRIPTION_LEVELS: [RegExp, string][] = [
  [/\b(?:entry[- ]level|new grad(?:uate)?s?|early[- ]career)\b/, "junior"],
  [/\bthis (?:is an? )?internship\b/, "intern"],
];

export function detectSeniority(title: string, description?: string): string | null {
  const t = ` ${title.toLowerCase()} `;
  for (const [keyword, level] of Object.entries(SENIORITY_KEYWORDS)) {
    // Whole words only: "intern" is not "internal", "cto" is not "director".
    const k = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tail = keyword.endsWith(" ") || keyword.endsWith(",") ? "" : "(?![a-z0-9])";
    if (new RegExp(`(?<![a-z0-9])${k}${tail}`).test(t)) return level;
  }
  const d = (description ?? "").toLowerCase().slice(0, 1500);
  for (const [re, level] of DESCRIPTION_LEVELS) if (re.test(d)) return level;
  return null;
}

// Neighbouring senior levels overlap in practice: a "Partnerships Lead" is
// usually a senior IC, and companies use Staff/Lead/Senior interchangeably.
// Junior and mid stay strict — that's the line people filter on.
const ADJACENT: Record<string, string[]> = {
  senior: ["lead"],
  lead: ["senior", "staff"],
  staff: ["lead", "principal"],
  principal: ["staff"],
};

function levelFits(level: string, wanted: string[]): boolean {
  return wanted.includes(level) || wanted.some((w) => ADJACENT[w]?.includes(level));
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
  if (locationFilter && !locationOk(job, locationFilter, remoteOnly)) return false; // job carries its title: territory roles

  // No role titles → no matches. A watchlist with no target role would
  // otherwise alert on every job at every tracked company — the exact
  // noise the product exists to eliminate. Users are prompted to add a
  // role (dashboard + matches page) before anything matches.
  if (roleTitles.length === 0) return false;

  if (!titleMatchesRoles(job.title, roleTitles)) return false;

  // Seniority filter: if user specified levels, check title AND description
  if (seniority.length > 0) {
    const detectedLevel = detectSeniority(job.title, job.description);
    if (detectedLevel) {
      if (!levelFits(detectedLevel, seniority)) return false;
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
