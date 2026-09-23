-- Supabase serves every table in `public` through its auto-generated REST API,
-- reachable with the anon key that ships to every browser. A table without RLS
-- is readable, writable, and deletable by anyone holding that key. Supabase's
-- security advisor flagged these nine (rls_disabled_in_public, 2026-09-19);
-- verified from outside with the anon key before this migration — e.g. all 21
-- tracked_roles rows and all 902K company_role_snapshots were readable.
--
-- The app never uses that API: all data access is Prisma, connected as
-- `postgres`, which has BYPASSRLS. So RLS with no policies denies the REST
-- roles (anon, authenticated) and changes nothing for the app.

ALTER TABLE "public"."_prisma_migrations"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."collection_companies"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."collections"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."company_insights"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."company_role_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."company_signals"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."funding_signals"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."linkedin_connections"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tracked_roles"          ENABLE ROW LEVEL SECURITY;

-- Root cause: every table added by a Prisma migration after the initial setup
-- shipped without RLS, while Supabase's default privileges auto-granted the
-- REST roles full access to it. Stop that grant for future tables, so a
-- forgotten ENABLE ROW LEVEL SECURITY is no longer an exposure. If a table is
-- ever meant to be read client-side via supabase-js, grant it explicitly.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
