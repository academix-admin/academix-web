-- =====================================================================================
-- Replace the literal `true` in permissive WRITE policies with the real intent, and remove
-- the temporary verification artifacts. Follows _rls_direct_write_lockdown_migration.sql.
-- ACADEMIX_PLAN Part VI, Q31b.
--
-- WHY THIS IS NEEDED EVEN THOUGH THE LOCKDOWN ALREADY BLOCKS DIRECT WRITES
-- The restrictive ax_rpc_only_* policies already AND with these, so effective access is
-- correct today. But a policy whose expression is `true` documents a lie: it states
-- "anyone may write any row", and only the presence of a second, separate policy makes that
-- untrue. Anyone reading the schema — or any future migration that drops the restrictive
-- layer — inherits an open door. It also keeps ~54 findings permanently lit in the Supabase
-- linter, which is how genuinely new problems get missed.
--
-- WHAT CHANGES BEHAVIOURALLY: nothing. Effective access is
--   (OR of permissive policies) AND (AND of restrictive policies).
-- The restrictive side already demands the '/rpc/%' request path, so rewriting a permissive
-- `true` to that same predicate leaves the conjunction identical.
--
-- NOT REWRITTEN — service_role-only policies (public.wallet_ledger_table "Service Role For
-- all", public.platform_config_table "platform_config_service_only"). `true` is correct and
-- deliberate there: the policy is scoped to service_role, which bypasses RLS regardless.
-- The linter flags them because it reads the expression without the role scope. Contorting a
-- correct policy to silence a false positive would make the schema worse, so they stay.
-- =====================================================================================

-- Remove the throwaway table and probe used to prove the mechanism before deploying it.
DROP FUNCTION IF EXISTS public._ax_proof_insert(text);
DROP TABLE IF EXISTS public._ax_proof_table CASCADE;
DROP FUNCTION IF EXISTS public._ax_probe_request_context();

DO $migration$
DECLARE
  r        record;
  v_pred   text := '(current_setting(''request.path'', true) LIKE ''/rpc/%'')';
  v_roles  text;
  v_using  text;
  v_check  text;
  v_count  integer := 0;
BEGIN
  FOR r IN
    SELECT schemaname AS sch, tablename AS tbl, policyname AS pol, cmd,
           array_to_string(roles, ', ') AS role_list,
           qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'personal')
      AND permissive = 'PERMISSIVE'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
      AND (qual = 'true' OR with_check = 'true')
      -- service_role policies are correct as-is; see header.
      AND NOT (array_to_string(roles, ',') = 'service_role')
  LOOP
    v_roles := r.role_list;

    -- Preserve each clause's presence exactly as it was; only the literal `true` is replaced.
    -- (For UPDATE, Postgres defaults a missing WITH CHECK to the USING expression, so a clause
    -- that was absent must stay absent rather than being invented here.)
    v_using := CASE WHEN r.qual IS NULL THEN NULL
                    WHEN r.qual = 'true' THEN v_pred
                    ELSE '(' || r.qual || ')' END;
    v_check := CASE WHEN r.with_check IS NULL THEN NULL
                    WHEN r.with_check = 'true' THEN v_pred
                    ELSE '(' || r.with_check || ')' END;

    EXECUTE format('DROP POLICY %I ON %I.%I', r.pol, r.sch, r.tbl);

    EXECUTE format('CREATE POLICY %I ON %I.%I FOR %s TO %s %s %s',
      r.pol, r.sch, r.tbl, r.cmd, v_roles,
      CASE WHEN v_using IS NULL THEN '' ELSE 'USING ' || v_using END,
      CASE WHEN v_check IS NULL THEN '' ELSE 'WITH CHECK ' || v_check END);

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'rewrote % always-true permissive write policies', v_count;
END
$migration$;
