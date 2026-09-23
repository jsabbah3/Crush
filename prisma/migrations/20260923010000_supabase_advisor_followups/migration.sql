-- Follow-ups from Supabase's security/performance advisor (its splinter lints,
-- run directly against the database 2026-09-23 after the RLS fix).

-- anon_/authenticated_security_definer_function_executable
-- handle_auth_user_upsert() is the SECURITY DEFINER trigger on auth.users that
-- creates each public.users row at sign-up. Functions get EXECUTE for PUBLIC by
-- default, so it was also reachable at /rest/v1/rpc/handle_auth_user_upsert.
-- It returns `trigger`, so Postgres refuses direct calls anyway — hygiene, not
-- an active hole. Revoking doesn't touch the trigger: Postgres checks EXECUTE
-- when a trigger is created, not when it fires (verified in a rolled-back
-- transaction first). update_updated_at() is the same kind of trigger-only
-- function, so it gets the same treatment.
REVOKE EXECUTE ON FUNCTION public.handle_auth_user_upsert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at()       FROM PUBLIC, anon, authenticated;

-- function_search_path_mutable
-- Pin search_path so a caller's search_path can't redirect what the function
-- resolves. NOW() comes from pg_catalog regardless.
ALTER FUNCTION public.update_updated_at() SET search_path = '';

-- auth_rls_initplan
-- Wrap auth.uid() in a scalar subquery so Postgres evaluates it once per
-- statement instead of once per row. Same predicates, same semantics.
ALTER POLICY "users: select own row" ON public.users
  USING ((SELECT auth.uid()) = id);
ALTER POLICY "users: insert own row" ON public.users
  WITH CHECK ((SELECT auth.uid()) = id);
ALTER POLICY "users: update own row" ON public.users
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

ALTER POLICY "tracked_companies: select own" ON public.tracked_companies
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "tracked_companies: insert own" ON public.tracked_companies
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "tracked_companies: update own" ON public.tracked_companies
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "tracked_companies: delete own" ON public.tracked_companies
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "matches: select own" ON public.matches
  USING (EXISTS (
    SELECT 1 FROM public.tracked_companies tc
    WHERE tc.id = matches.tracked_company_id AND tc.user_id = (SELECT auth.uid())
  ));
ALTER POLICY "matches: update own" ON public.matches
  USING (EXISTS (
    SELECT 1 FROM public.tracked_companies tc
    WHERE tc.id = matches.tracked_company_id AND tc.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tracked_companies tc
    WHERE tc.id = matches.tracked_company_id AND tc.user_id = (SELECT auth.uid())
  ));

-- unindexed_foreign_keys
-- company_id isn't the leading column of either table's primary key, so
-- deleting a company scanned both tables to enforce the cascade.
CREATE INDEX "collection_companies_company_id_idx" ON "public"."collection_companies"("company_id");
CREATE INDEX "company_insights_company_id_idx" ON "public"."company_insights"("company_id");
