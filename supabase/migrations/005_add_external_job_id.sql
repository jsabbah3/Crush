-- Add external_job_id for API deduplication
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_job_id TEXT;

-- Unique constraint: one row per (company, external job)
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_company_id_external_job_id_key;
ALTER TABLE jobs ADD CONSTRAINT jobs_company_id_external_job_id_key
  UNIQUE (company_id, external_job_id);

CREATE INDEX IF NOT EXISTS idx_jobs_external_job_id ON jobs (company_id, external_job_id);
