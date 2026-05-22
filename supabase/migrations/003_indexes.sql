-- ============================================================
-- 003_indexes.sql
-- Covers the access patterns used by the app:
--   • company lookup by slug
--   • jobs by company, recency, status
--   • tracked_companies by user or company
--   • matches for a user's feed (undismissed, newest first)
-- ============================================================

-- companies
CREATE INDEX companies_industry_idx ON companies (industry)
  WHERE industry IS NOT NULL;

-- jobs
CREATE INDEX jobs_company_id_idx         ON jobs (company_id);
CREATE INDEX jobs_posted_at_idx          ON jobs (posted_at DESC NULLS LAST);
CREATE INDEX jobs_status_company_id_idx  ON jobs (status, company_id);

-- tracked_companies
CREATE INDEX tc_user_id_idx             ON tracked_companies (user_id);
CREATE INDEX tc_company_id_idx          ON tracked_companies (company_id);

-- matches
CREATE INDEX matches_tracked_company_id_idx ON matches (tracked_company_id);
CREATE INDEX matches_job_id_idx             ON matches (job_id);

-- Feed query: user's undismissed matches, newest first.
-- The join goes: matches → tracked_companies.user_id = ?
-- This index covers (tracked_company_id, dismissed, created_at).
CREATE INDEX matches_feed_idx ON matches (tracked_company_id, dismissed, created_at DESC);
