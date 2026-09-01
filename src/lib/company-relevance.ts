import { Prisma } from "@/generated/prisma/client";
import { CompanySource } from "@/generated/prisma/enums";

/**
 * Whether a company has enough signal to be public: surfaced on discovery
 * (browse, search) AND reachable by strangers on its own detail page. A
 * company failing this is private — visible only to whoever is already
 * tracking it — until it earns a signal, at which point it graduates
 * automatically (this is the only gate; there's no separate "publish" step).
 *
 * This is what makes self-serve "Add Company" safe: the create flow already
 * runs ATS detection, so a real company graduates to public immediately,
 * while a zero-signal add (someone's personal watchlist pick with no
 * detectable job board — see the outdoor-brand incident) never becomes a
 * stranger-visible page. Nothing is deleted either way — a private company
 * still exists, still gets picked up by later backfill/detect-ats passes,
 * and still graduates the moment one of those finds something.
 *
 * A company is public if it has ANY of:
 *   - an ATS source (greenhouse/lever/ashby/gem) — real hiring infrastructure
 *   - VC-portfolio tags (a16z, YC, Sequoia, ...) — sourced from a real
 *     portfolio, which is itself a strong pre-filter
 *   - an industry label — hand-curated or set at ingestion
 */
const RELEVANT_SOURCE_TYPES: CompanySource[] = [
  CompanySource.greenhouse,
  CompanySource.lever,
  CompanySource.ashby,
  CompanySource.gem,
];

export const relevantCompanyWhere: Prisma.CompanyWhereInput = {
  OR: [
    { sourceType: { in: RELEVANT_SOURCE_TYPES } },
    { tags: { isEmpty: false } },
    { industry: { not: null } },
  ],
};

/** Same predicate, as a raw-SQL fragment for the raw-query browse path. */
export const relevantCompanySql = Prisma.sql`(
  c.source_type IN ('greenhouse', 'lever', 'ashby', 'gem')
  OR array_length(c.tags, 1) > 0
  OR c.industry IS NOT NULL
)`;

const RELEVANT_SOURCE_TYPE_SET = new Set<string>(RELEVANT_SOURCE_TYPES);

/**
 * Same predicate, evaluated in-memory against an already-fetched company —
 * for the detail page's access check, where the row is already in hand and
 * a second query would be wasteful.
 */
export function isCompanyPublic(company: {
  sourceType: string;
  tags: string[];
  industry: string | null;
}): boolean {
  return (
    RELEVANT_SOURCE_TYPE_SET.has(company.sourceType) ||
    company.tags.length > 0 ||
    company.industry !== null
  );
}
