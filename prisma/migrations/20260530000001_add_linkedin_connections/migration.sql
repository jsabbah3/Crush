CREATE TABLE "linkedin_connections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "linkedin_url" TEXT,
  "company" TEXT NOT NULL,
  "title" TEXT,
  "connected_on" TIMESTAMP(3),
  "company_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "linkedin_connections_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "linkedin_connections"
  ADD CONSTRAINT "linkedin_connections_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "linkedin_connections"
  ADD CONSTRAINT "linkedin_connections_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "linkedin_connections_user_id_idx" ON "linkedin_connections"("user_id");
CREATE INDEX "linkedin_connections_company_id_idx" ON "linkedin_connections"("company_id");
