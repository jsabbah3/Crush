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
};
