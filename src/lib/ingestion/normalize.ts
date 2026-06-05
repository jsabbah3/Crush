import { JobType } from "@/generated/prisma/enums";

export function normalizeJobType(raw: string | null | undefined): JobType {
  const s = (raw ?? "").toLowerCase().replace(/[-_\s]+/g, "");
  if (s.includes("parttime")) return JobType.PART_TIME;
  if (s.includes("contract")) return JobType.CONTRACT;
  if (s.includes("intern")) return JobType.INTERNSHIP;
  if (s.includes("freelance")) return JobType.FREELANCE;
  return JobType.FULL_TIME;
}

export function isRemoteLocation(location: string | null | undefined): boolean {
  if (!location) return false;
  return /remote|anywhere|distributed/i.test(location);
}

// Returns true if the location is US-based or remote (we keep both)
export function isUSOrRemote(location: string | null | undefined): boolean {
  if (!location) return true; // no location info → keep it
  const loc = location.toLowerCase();

  // Explicitly remote → keep
  if (isRemoteLocation(loc)) return true;

  // Clearly non-US countries → drop
  const nonUS = [
    "canada", "uk", "united kingdom", "england", "australia", "india",
    "germany", "france", "spain", "netherlands", "brazil", "mexico",
    "singapore", "japan", "china", "israel", "sweden", "norway", "denmark",
    "finland", "poland", "czech", "austria", "switzerland", "belgium",
    "portugal", "italy", "ireland", "new zealand", "argentina", "colombia",
    "chile", "peru", "south korea", "taiwan", "hong kong", "indonesia",
    "malaysia", "thailand", "philippines", "pakistan", "nigeria", "kenya",
    "south africa", "egypt", "uae", "dubai", "turkey", "russia", "ukraine",
    "romania", "hungary", "bulgaria", "croatia", "serbia",
  ];
  if (nonUS.some((country) => loc.includes(country))) return false;

  // US state abbreviations / keywords → keep
  const usKeywords = [
    "united states", " us", "usa", ", ca", ", ny", ", tx", ", wa", ", fl",
    ", ma", ", il", ", co", ", ga", ", nc", ", va", ", az", ", or", ", mi",
    ", pa", ", nj", ", mn", ", oh", ", tn", ", mo", ", sc", ", in", ", ut",
    "san francisco", "new york", "los angeles", "seattle", "chicago",
    "boston", "austin", "denver", "atlanta", "miami", "portland",
    "washington dc", "washington, d.c", "brooklyn", "brooklyn",
    "palo alto", "menlo park", "mountain view", "sunnyvale", "santa clara",
    "redwood city", "san jose", "san diego", "san mateo", "burlingame",
    "cupertino", "bellevue", "kirkland", "remote - us", "us only",
  ];
  if (usKeywords.some((kw) => loc.includes(kw))) return true;

  // Ambiguous (no clear country signal) → keep
  return true;
}

export type IngestedJob = {
  externalJobId: string;
  title: string;
  description: string;
  type: JobType;
  location: string | null;
  remote: boolean;
  url: string | null;
  postedAt: Date | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
};

/**
 * Extract a salary range from a job description.
 * Handles formats like: $150k–$200k, $150,000 - $200,000, $180K to $220K
 * Returns null when no credible range is found.
 */
export function parseSalary(text: string | null | undefined): {
  min: number; max: number; currency: string;
} | null {
  if (!text) return null;

  // Strip HTML tags
  const plain = text.replace(/<[^>]+>/g, " ");

  // Skip non-USD descriptions (avoid misparse of GBP/EUR)
  if (/£|\bGBP\b|€|\bEUR\b/i.test(plain)) return null;

  // Match: $150k - $200k  |  $150,000–$200,000  |  $150K to $220K
  const rangeRe =
    /\$\s*([\d,]+(?:\.\d+)?)\s*(k|K)?\s*(?:[-–—]|to)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(k|K)?/;

  const m = rangeRe.exec(plain);
  if (m) {
    const parse = (val: string, k: string | undefined) => {
      const n = parseFloat(val.replace(/,/g, ""));
      return k ? Math.round(n * 1000) : Math.round(n);
    };
    const min = parse(m[1], m[2]);
    const max = parse(m[3], m[4]);
    // Sanity check: realistic annual salary range
    if (min >= 20_000 && max <= 2_000_000 && min < max) {
      return { min, max, currency: "USD" };
    }
  }

  return null;
}
