-- =====================================================================================
-- Close direct-table-write access for anon/authenticated (Supabase linter 0024,
-- rls_policy_always_true). ACADEMIX_PLAN Part VI, Q31.
--
-- WHAT WAS WRONG
-- Supabase's default blanket grant gives anon AND authenticated INSERT/UPDATE/DELETE on every
-- table in the exposed schemas (public, personal — confirmed via the project's PostgREST
-- db_schema setting). RLS is therefore the ONLY thing standing between the open internet and
-- these tables, and ~30 of them carried policies whose expression is the literal `true`.
--
-- Concretely, before this migration a user with nothing but a free account and the public anon
-- key could PATCH /rest/v1/users_balance_table (Content-Profile: personal) and set their own
-- balance to any number, bypassing every line of business logic. The same held for
-- redeemable_table, giveback_table, payment_profile_table, pools_table, question_tracker_table
-- (answer keys / grading), and the reward-progress tables that convert into money.
--
-- WHY NOT SIMPLY DROP THE PERMISSIVE POLICIES
-- 69 SECURITY INVOKER functions write these tables. INVOKER means they run as the CALLING role
-- (authenticated), so they depend on exactly these grants and policies. Dropping the policies
-- would close the hole and break the entire application at the same time.
--
-- THE FIX
-- Every legitimate write in this system already arrives through an RPC — verified by searching
-- all three clients (academix-web browser code, academix-app Flutter, academix-manangement):
-- there is not one direct table write among them. The web's only direct writes are in
-- src/app/api/* route handlers, which use the service_role key.
--
-- PostgREST publishes the request path to SQL as `request.path`: an RPC call reports
-- '/rpc/<function>', a direct table write reports '/<table>'. So a RESTRICTIVE policy that
-- demands the '/rpc/%' shape permits every legitimate write and refuses direct table access,
-- with zero changes to any function body.
--
-- RESTRICTIVE (not PERMISSIVE) is the key detail: restrictive policies AND with the existing
-- permissive ones rather than OR-ing, so this can only ever subtract access. The existing
-- policies are left exactly as they are.
--
-- Scoped FOR INSERT / UPDATE / DELETE only — SELECT is untouched, so all public read access
-- behaves identically.
--
-- Scoped TO anon, authenticated only — service_role (the Lambdas and the Next.js route
-- handlers) and postgres are not targeted and are unaffected.
--
-- NOT applied to the storage schema: Storage API uploads do not travel through /rest/v1/rpc,
-- so this predicate would break file uploads. storage.objects is tracked separately as Q32.
--
-- VERIFIED BEFORE DEPLOY on a throwaway table carrying an identical permissive policy:
--   direct REST insert  -> 42501 row-level security violation
--   same insert via a SECURITY INVOKER rpc -> succeeds
--
-- Idempotent: re-running drops and recreates its own policies and touches nothing else.
-- =====================================================================================

DO $migration$
DECLARE
  r         record;
  v_pred    text := 'current_setting(''request.path'', true) LIKE ''/rpc/%''';
  v_count   integer := 0;
BEGIN
  FOR r IN
    SELECT n.nspname AS sch, c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname IN ('public', 'personal')
      AND c.relrowsecurity                    -- policies are inert unless RLS is on
      -- Only tables anon/authenticated can actually write; elsewhere the policy would be a no-op.
      AND (has_table_privilege('anon', c.oid, 'INSERT')
        OR has_table_privilege('anon', c.oid, 'UPDATE')
        OR has_table_privilege('anon', c.oid, 'DELETE')
        OR has_table_privilege('authenticated', c.oid, 'INSERT')
        OR has_table_privilege('authenticated', c.oid, 'UPDATE')
        OR has_table_privilege('authenticated', c.oid, 'DELETE'))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'ax_rpc_only_insert', r.sch, r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'ax_rpc_only_update', r.sch, r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'ax_rpc_only_delete', r.sch, r.tbl);

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (%s)',
      'ax_rpc_only_insert', r.sch, r.tbl, v_pred);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (%s) WITH CHECK (%s)',
      'ax_rpc_only_update', r.sch, r.tbl, v_pred, v_pred);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (%s)',
      'ax_rpc_only_delete', r.sch, r.tbl, v_pred);

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'direct-write lockdown applied to % tables', v_count;
END
$migration$;


-- -------------------------------------------------------------------------------------
-- Targeted fixes for policies the blanket rule above does not fully address.
-- -------------------------------------------------------------------------------------

-- fraud_logs: the policy is named "Service role can insert fraud logs" but was created for the
-- `public` role with WITH CHECK (true) — i.e. anyone at all could forge fraud-log entries and
-- drown out real signal. service_role bypasses RLS, so naming it explicitly costs nothing and
-- makes the intent match the name.
DROP POLICY IF EXISTS "Service role can insert fraud logs" ON public.fraud_logs;
CREATE POLICY "Service role can insert fraud logs" ON public.fraud_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- users_login_pin_table: WITH CHECK correctly pinned the new row to auth.uid(), but USING was
-- `true`, so a caller could TARGET another user's PIN row and rewrite it to belong to
-- themselves — deleting the victim's PIN in the process. USING must match WITH CHECK.
DROP POLICY IF EXISTS "Enable update for authenticated original users only" ON personal.users_login_pin_table;
CREATE POLICY "Enable update for authenticated original users only" ON personal.users_login_pin_table
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = users_id)
  WITH CHECK ((SELECT auth.uid()) = users_id);

-- _unused_category_group_table is dead (the `_unused_` prefix is this project's quarantine
-- convention). Nothing should be able to write it at all.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public._unused_category_group_table;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public._unused_category_group_table;
REVOKE INSERT, UPDATE, DELETE ON public._unused_category_group_table FROM anon, authenticated;
