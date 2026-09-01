import { Prisma } from "@/generated/prisma/client";
import { CompanySource } from "@/generated/prisma/enums";

/**
 * Whether a company has enough signal to be worth surfacing on discovery
 * surfaces (browse grid, search). Companies failing this stay in the
 * database untouched — they're reachable by direct link, still eligible for
 * the backfill/detect-ats pipeline, and can graduate into view the moment
 * they pick up a signal. This is a display filter, not a deletion policy:
 * self-serve "Add Company" lets anyone create a public row for literally any
 * name with zero relevance check, so this is the actual gate.
 *
 * A company is relevant if it has ANY of:
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
