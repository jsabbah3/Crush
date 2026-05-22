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
