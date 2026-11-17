-- Company provenance and freshness, for daily discovery and "New on Crush".
ALTER TABLE "companies" ADD COLUMN "discovered_via" TEXT;
ALTER TABLE "companies" ADD COLUMN "listed_at" TIMESTAMP(3);
ALTER TABLE "companies" ADD COLUMN "ats_checked_at" TIMESTAMP(3);

-- Backfill: a company was "listed" when we first stored a role for it.
UPDATE "companies" c
SET "listed_at" = j.first_job
FROM (SELECT company_id, MIN(created_at) AS first_job FROM "jobs" GROUP BY company_id) j
WHERE j.company_id = c.id;

CREATE INDEX "companies_listed_at_idx" ON "companies"("listed_at");
CREATE INDEX "companies_recently_funded_at_idx" ON "companies"("recently_funded_at");
