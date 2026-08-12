-- =====================================================================================
-- Stop anonymous/lateral READS of financial and personal data. ACADEMIX_PLAN Part VI, Q33.
--
-- WHAT WAS WRONG
-- These tables carried `SELECT USING (true)` for the `public` role, which includes anon.
-- Confirmed live, using nothing but the public anon key and no account at all:
--     payment_details_table   122 rows readable
--     payment_profile_table   106 rows readable
--     users_table              26 rows readable  (includes email / phone columns)
-- and users_balance_table, whose SELECT policy names `authenticated`, was readable in full by
-- ANY logged-in user — every user's balance.
--
-- The Supabase linter does not flag these. Lint 0024 deliberately excludes `SELECT USING(true)`
-- because it is usually an intentional public-catalogue pattern. That exclusion is right for
-- country_table and language_table; it is wrong for payment records, so this was invisible in
-- the warning list and had to be found by reading the policies directly.
--
-- WHY NOT AN OWN-ROW POLICY (users_id = auth.uid())
-- 69 SECURITY INVOKER functions run as the calling user and legitimately read OTHER users'
-- rows — creator names, leaderboards, pool opponents. An own-row policy would break them.
-- The '/rpc/%' request-path gate keeps every function working while removing direct REST
-- access, which is the actual exposure: no client reads any of these tables directly
-- (verified across academix-web, academix-app and academix-manangement — the only direct
-- reads are src/app/api/* route handlers, which use the service_role key and bypass RLS).
--
-- RESTRICTIVE, so it ANDs with the existing policies and can only subtract access.
-- Scoped TO anon, authenticated — service_role and postgres are unaffected.
--
-- Deliberately NOT applied to the public catalogue tables (country, language, gender, age,
-- roles, achievements, missions, …). Those are meant to be world-readable and several are
-- fetched before login.
-- =====================================================================================

DO $migration$
DECLARE
  r       record;
  v_pred  text := '(current_setting(''request.path'', true) LIKE ''/rpc/%'')';
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT sch, tbl FROM (VALUES
      ('personal', 'users_balance_table'),
      ('public',   'payment_details_table'),
      ('public',   'payment_profile_table'),
      ('public',   'redeemable_table'),
      ('public',   'users_table')
    ) AS t(sch, tbl)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'ax_rpc_only_select', r.sch, r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (%s)',
      'ax_rpc_only_select', r.sch, r.tbl, v_pred);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'read lockdown applied to % sensitive tables', v_count;
END
$migration$;
