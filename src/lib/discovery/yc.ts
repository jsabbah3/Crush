/**
 * Y Combinator's recent batches, from the yc-oss mirror of YC's public
 * company directory (updated daily: https://github.com/yc-oss/api).
 */

const YC_ALL = "https://yc-oss.github.io/api/companies/all.json";

export type YcCompany = {
  name: string;
  website: string | null;
  batch: string; // "Fall 2026"
  oneLiner: string | null;
  industry: string | null;
  isHiring: boolean;
  regions: string[];
};

type Raw = {
  name: string;
  website?: string;
  batch?: string;
  status?: string;
  one_liner?: string;
  industry?: string;
  isHiring?: boolean;
  regions?: string[];
};

const SEASON_MONTH: Record<string, number> = { Winter: 0, Spring: 3, Summer: 6, Fall: 9 };

/** "Fall 2026" → start of that batch, for "is this batch recent?". */
function batchStart(batch: string): Date | null {
  const m = batch.match(/^(Winter|Spring|Summer|Fall)\s+(\d{4})$/);
  return m ? new Date(Date.UTC(Number(m[2]), SEASON_MONTH[m[1]], 1)) : null;
}

/** Short tag form: "Fall 2026" → "YC F26". */
export function ycBatchTag(batch: string): string {
  const m = batch.match(/^(Winter|Spring|Summer|Fall)\s+(\d{4})$/);
  return m ? `YC ${m[1][0]}${m[2].slice(2)}` : "YC";
}

/** Active companies from YC batches that started in the last `months` months. */
export async function fetchRecentYc(months = 13): Promise<YcCompany[]> {
  const res = await fetch(YC_ALL, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`YC directory ${res.status}`);
  const all = (await res.json()) as Raw[];
  const cutoff = Date.now() - months * 30 * 86_400_000;

  return all
    .filter((c) => c.status === "Active" && c.batch && (batchStart(c.batch)?.getTime() ?? 0) >= cutoff)
    .map((c) => ({
      name: c.name.trim(),
      website: c.website?.trim() || null,
      batch: c.batch!,
      oneLiner: c.one_liner?.trim() || null,
      industry: c.industry?.trim() || null,
      isHiring: !!c.isHiring,
      regions: c.regions ?? [],
    }));
}
