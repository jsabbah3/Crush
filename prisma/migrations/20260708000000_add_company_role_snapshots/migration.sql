-- Add tracking_started_at to companies: the earliest date this company's
-- job data is reliable (first ingestion). Trend windows must never reach
-- before this date.
ALTER TABLE "companies" ADD COLUMN "tracking_started_at" TIMESTAMP(3);

-- Backfill from each company's first-ever ingested job. Companies with no
-- jobs yet stay NULL; the snapshot cron sets it on their first capture.
UPDATE "companies" c
SET "tracking_started_at" = sub.first_seen
FROM (
  SELECT "company_id", min("created_at") AS first_seen
  FROM "jobs"
  GROUP BY "company_id"
) sub
WHERE c."id" = sub."company_id";

-- Create company_role_snapshots: one row per company per day recording how
-- many roles were open. Append-only history behind hiring-momentum trends.
CREATE TABLE "company_role_snapshots" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "captured_on"      DATE         NOT NULL,
  "open_roles_total" INTEGER      NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "company_id"       UUID         NOT NULL,

  CONSTRAINT "company_role_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_role_snapshots_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Idempotent daily upsert target
CREATE UNIQUE INDEX "company_role_snapshots_company_id_captured_on_key"
  ON "company_role_snapshots"("company_id", "captured_on");
