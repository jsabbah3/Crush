CREATE TYPE "application_status" AS ENUM ('INTERESTED', 'APPLIED', 'INTERVIEWING', 'REJECTED', 'OFFER', 'NOT_INTERESTED');

ALTER TABLE "matches"
  ADD COLUMN "application_status" "application_status" NOT NULL DEFAULT 'INTERESTED',
  ADD COLUMN "application_note" TEXT,
  ADD COLUMN "applied_at" TIMESTAMPTZ;
