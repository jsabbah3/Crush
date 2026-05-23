ALTER TABLE "users"
  ADD COLUMN "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "default_criteria" JSONB;
