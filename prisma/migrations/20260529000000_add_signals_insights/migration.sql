-- Add blog RSS URL to companies
ALTER TABLE "companies" ADD COLUMN "blog_rss_url" TEXT;

-- Create signal_type enum
CREATE TYPE "signal_type" AS ENUM ('blog_post', 'news');

-- Create company_signals table
CREATE TABLE "company_signals" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id"   UUID NOT NULL,
  "type"         "signal_type" NOT NULL DEFAULT 'blog_post',
  "title"        TEXT NOT NULL,
  "url"          TEXT,
  "summary"      TEXT,
  "published_at" TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "company_signals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_signals_company_id_url_key" UNIQUE ("company_id", "url")
);

ALTER TABLE "company_signals"
  ADD CONSTRAINT "company_signals_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

-- Create company_insights table
CREATE TABLE "company_insights" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id"   UUID NOT NULL,
  "slug"         TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "body"         TEXT NOT NULL,
  "author"       TEXT,
  "published_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "company_insights_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_insights_slug_key" UNIQUE ("slug")
);

ALTER TABLE "company_insights"
  ADD CONSTRAINT "company_insights_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
