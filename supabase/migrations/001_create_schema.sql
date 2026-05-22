-- ============================================================
-- 001_create_schema.sql
-- Replaces the Prisma db-push tables with proper snake_case
-- schema including source tracking columns on companies.
-- ============================================================

-- ------------------------------------------------------------
-- Tear down Prisma-generated tables (CASCADE removes FKs)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS "Match"           CASCADE;
DROP TABLE IF EXISTS "TrackedCompany"  CASCADE;
DROP TABLE IF EXISTS "Job"             CASCADE;
DROP TABLE IF EXISTS "Company"         CASCADE;
DROP TABLE IF EXISTS "User"            CASCADE;

DROP TYPE IF EXISTS "JobType"   CASCADE;
DROP TYPE IF EXISTS "JobStatus" CASCADE;

-- ------------------------------------------------------------
-- Enums
-- UPPERCASE values kept for Prisma compatibility.
-- company_source is new; lowercase is fine since Prisma will
-- use @map() on each value.
-- ------------------------------------------------------------
CREATE TYPE job_type AS ENUM (
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE'
);

CREATE TYPE job_status AS ENUM (
  'ACTIVE',
  'CLOSED'
);

CREATE TYPE company_source AS ENUM (
  'greenhouse',
  'lever',
  'ashby',
  'workday',
  'manual'
);

-- ------------------------------------------------------------
-- users
-- id mirrors auth.users so Supabase Auth is the source of truth.
-- ------------------------------------------------------------
CREATE TABLE users (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL UNIQUE,
  name       TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create / sync a public.users row whenever someone signs
-- in or updates their profile via Supabase Auth.
CREATE OR REPLACE FUNCTION handle_auth_user_upsert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    name       = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_upsert
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_auth_user_upsert();

-- ------------------------------------------------------------
-- companies
-- source_type / source_id identify the ATS board used for
-- job scraping (e.g. greenhouse board token, Lever slug).
-- ------------------------------------------------------------
CREATE TABLE companies (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT           NOT NULL,
  slug         TEXT           NOT NULL UNIQUE,
  description  TEXT,
  website      TEXT,
  logo_url     TEXT,
  industry     TEXT,
  headquarters TEXT,
  source_type  company_source NOT NULL DEFAULT 'manual',
  source_id    TEXT,          -- ATS board token / slug (NULL until verified)
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- jobs
-- ------------------------------------------------------------
CREATE TABLE jobs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT        NOT NULL DEFAULT '',
  type        job_type    NOT NULL,
  location    TEXT,
  remote      BOOLEAN     NOT NULL DEFAULT FALSE,
  salary_min  INTEGER,
  salary_max  INTEGER,
  currency    TEXT        NOT NULL DEFAULT 'USD',
  url         TEXT,
  status      job_status  NOT NULL DEFAULT 'ACTIVE',
  posted_at   TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- tracked_companies
-- One row per (user, company) pair. Criteria columns are all
-- nullable / empty-default so "track with no filters" works.
-- ------------------------------------------------------------
CREATE TABLE tracked_companies (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  keywords        TEXT[]      NOT NULL DEFAULT '{}',
  job_types       job_type[]  NOT NULL DEFAULT '{}',
  remote_only     BOOLEAN,            -- NULL = no preference
  location_filter TEXT,
  email_alerts    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, company_id)
);

-- ------------------------------------------------------------
-- matches
-- Created by the ingest pipeline when a job satisfies a
-- tracked_company's criteria.
-- ------------------------------------------------------------
CREATE TABLE matches (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_company_id UUID        NOT NULL REFERENCES tracked_companies(id) ON DELETE CASCADE,
  job_id             UUID        NOT NULL REFERENCES jobs(id)              ON DELETE CASCADE,
  notified           BOOLEAN     NOT NULL DEFAULT FALSE,
  notified_at        TIMESTAMPTZ,
  dismissed          BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tracked_company_id, job_id)
);

-- ------------------------------------------------------------
-- updated_at trigger (shared function)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tracked_companies_updated_at
  BEFORE UPDATE ON tracked_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
