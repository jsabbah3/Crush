-- Nightly ingestion coverage check results (see /api/cron/coverage).
CREATE TABLE "coverage_checks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ran_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companies" INTEGER NOT NULL,
    "live_roles" INTEGER NOT NULL,
    "present" INTEGER NOT NULL,
    "stale_active" INTEGER NOT NULL,
    "title_drift" INTEGER NOT NULL,
    "details" JSONB NOT NULL,

    CONSTRAINT "coverage_checks_pkey" PRIMARY KEY ("id")
);

-- Same as every public table: RLS on, no policies — closed to the Supabase
-- REST roles; Prisma connects as postgres (BYPASSRLS) and is unaffected.
ALTER TABLE "public"."coverage_checks" ENABLE ROW LEVEL SECURITY;
