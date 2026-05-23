-- Add unique constraint on (company_id, external_job_id) as the deduplication key for ingested jobs.
-- PostgreSQL treats NULLs as distinct in UNIQUE indexes, so manually-created jobs with NULL
-- external_job_id will not conflict with each other.
CREATE UNIQUE INDEX "jobs_company_id_external_job_id_key" ON "jobs"("company_id", "external_job_id");
