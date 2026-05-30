-- Add recently_funded_at to companies
ALTER TABLE "companies" ADD COLUMN "recently_funded_at" TIMESTAMP(3);

-- Create funding_signal_status enum
CREATE TYPE "funding_signal_status" AS ENUM ('pending', 'approved', 'rejected', 'added');

-- Create funding_signals table
CREATE TABLE "funding_signals" (
  "id"           UUID    NOT NULL DEFAULT gen_random_uuid(),
  "company_name" TEXT    NOT NULL,
  "website"      TEXT,
  "amount"       TEXT,
  "round"        TEXT,
  "investors"    TEXT,
  "source_url"   TEXT    NOT NULL,
  "ats_url"      TEXT,
  "ats_platform" TEXT,
  "ats_slug"     TEXT,
  "status"       "funding_signal_status" NOT NULL DEFAULT 'pending',
  "auto_approved" BOOLEAN NOT NULL DEFAULT false,
  "company_id"   UUID,
  "detected_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "funding_signals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "funding_signals_source_url_key" ON "funding_signals"("source_url");
