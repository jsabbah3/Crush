import { CompanySource } from "@/generated/prisma/enums";

const BOARD_NAMES: Partial<Record<CompanySource, string>> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  gem: "Gem",
  workday: "Workday",
};

// The boards ingestion can actually read today. Workday is in the enum but
// has no fetcher, so a Workday company is "found, not yet readable".
const READABLE: CompanySource[] = [
  CompanySource.greenhouse,
  CompanySource.lever,
  CompanySource.ashby,
  CompanySource.gem,
];

export type BoardStatus =
  | { connected: true; board: string }
  | { connected: false; board: string | null };

/**
 * Can Crush actually see this company's openings? Everything a user is told
 * about a company ("we check daily", "no open roles right now") is only true
 * when this says connected — otherwise "no roles" just means "we can't look",
 * and the interface has to say that instead.
 */
export function boardStatus(company: { sourceType: string; sourceId: string | null }): BoardStatus {
  const type = company.sourceType as CompanySource;
  const board = BOARD_NAMES[type] ?? null;
  if (company.sourceId && READABLE.includes(type) && board) return { connected: true, board };
  return { connected: false, board };
}
