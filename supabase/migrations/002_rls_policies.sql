-- ============================================================
-- 002_rls_policies.sql
-- Row-level security for all public tables.
--
-- Rule of thumb:
--   companies / jobs  → public read, service-role write only
--   users             → own row only
--   tracked_companies → own rows only
--   matches           → own rows only (via tracked_companies)
-- ============================================================

-- Enable RLS on every table
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches           ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- users
-- ============================================================
CREATE POLICY "users: select own row"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users: insert own row"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users: update own row"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- companies  (public read; writes go through service role)
-- ============================================================
CREATE POLICY "companies: public read"
  ON companies FOR SELECT
  USING (TRUE);

-- ============================================================
-- jobs  (public read; writes go through service role / ingest API)
-- ============================================================
CREATE POLICY "jobs: public read"
  ON jobs FOR SELECT
  USING (TRUE);

-- ============================================================
-- tracked_companies  (own rows only)
-- ============================================================
CREATE POLICY "tracked_companies: select own"
  ON tracked_companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tracked_companies: insert own"
  ON tracked_companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tracked_companies: update own"
  ON tracked_companies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tracked_companies: delete own"
  ON tracked_companies FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- matches  (own rows only — ownership checked via tracked_companies)
-- ============================================================
CREATE POLICY "matches: select own"
  ON matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tracked_companies tc
      WHERE tc.id = matches.tracked_company_id
        AND tc.user_id = auth.uid()
    )
  );

CREATE POLICY "matches: update own"
  ON matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tracked_companies tc
      WHERE tc.id = matches.tracked_company_id
        AND tc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tracked_companies tc
      WHERE tc.id = matches.tracked_company_id
        AND tc.user_id = auth.uid()
    )
  );
