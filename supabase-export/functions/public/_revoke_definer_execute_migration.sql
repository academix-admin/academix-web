-- =====================================================================================
-- Revoke EXECUTE on SECURITY DEFINER functions that no client legitimately calls
-- (Supabase linter: anon_security_definer_function_executable /
-- authenticated_security_definer_function_executable). ACADEMIX_PLAN Part VI, Q37.
--
-- WHY IT MATTERS
-- A SECURITY DEFINER function runs as its owner and bypasses RLS. Leaving EXECUTE granted to
-- `anon` publishes a privileged entry point at /rest/v1/rpc/<name> that anyone on the internet
-- can invoke with nothing but the public anon key — no account required.
--
-- WHY REVOKING IS SAFE FOR THESE
-- Three separate reasons, established per function rather than assumed:
--   1. TRIGGERS — a trigger function is invoked by the trigger, never by a caller, so no client
--      grant is involved: gate_new_session, notify_new_session.
--   2. NESTED CALLS — a function called from inside another SECURITY DEFINER function runs in
--      the enclosing function's security context, so the client's own grant is irrelevant.
--      gate_check has 30 such callers, resolve_ip_geo 2, session_gate_status 2, and so on.
--   3. SERVICE ROLE — the Lambdas and the Next.js route handlers use the service_role key,
--      which is unaffected by grants to anon/authenticated. gate_check's only direct call
--      sites are Lambdas (create_or_join_public_quiz_pool, make_payment).
-- Confirmed by searching every client for `.rpc('<name>')`: academix-web, academix-app and
-- academix-manangement. None of the functions below has a client call site.
--
-- handle_new_user is additionally orphaned: 0 triggers reference it and 0 functions call it.
-- It is the classic Supabase auth.users hook, superseded here by the create-oauth-user route.
--
-- DELIBERATELY LEFT ALONE — these have genuine pre-auth callers and revoking them would break
-- real users:
--   * enforce_session          — PostgREST's db_pre_request hook. It runs AFTER the role switch,
--                                as anon/authenticated. Revoking it breaks EVERY request in
--                                both apps. This one is a trap; do not "clean it up".
--   * location_gate            — the browser calls it before login for the country gate
--                                (src/utils/gate.ts, Features.sign_in).
--   * change_newsletter_subscription — the public marketing footer (LandingFooter.tsx).
--
-- get_my_sessions and register_session_device keep their `authenticated` grant (the
-- active-devices UI in both apps depends on them); only the pointless `anon` grant is dropped.
--
-- THE PUBLIC GRANT — why `REVOKE ... FROM anon` alone is not enough
-- Postgres grants EXECUTE on every new function to PUBLIC by default, and PUBLIC is inherited
-- by every role. Most of these functions carry that default grant, visible in pg_proc.proacl
-- as an entry with an EMPTY grantee:
--     assert_allowed_region -> {=X/postgres, postgres=X/postgres, service_role=X/postgres}
--                               ^^^^^^^^^^^ this is PUBLIC
-- Revoking from `anon` leaves that entry untouched, so anon keeps EXECUTE through PUBLIC and
-- the revoke silently accomplishes nothing. (Verified: after a FROM anon-only revoke,
-- /rpc/get_my_sessions still returned 200 with `[]` rather than 42501.) Every revoke below
-- therefore includes PUBLIC.
--
-- For the anon-only group, `authenticated` is GRANTed explicitly first, so that removing the
-- PUBLIC grant cannot take the authenticated path away with it.
-- =====================================================================================

DO $migration$
DECLARE
  r         record;
  v_both    text[] := ARRAY[
    'assert_allowed_region', 'assert_can_review', 'gate_check', 'gate_new_session',
    'handle_new_user', 'ingest_ip_geo', 'notify_new_session', 'notify_secret',
    'region_block_status', 'request_ip_geo', 'resolve_ip_geo', 'session_gate_status'
  ];
  v_anon    text[] := ARRAY['get_my_sessions', 'register_session_device'];
  v_count   integer := 0;
BEGIN
  -- Revoked from both roles: no client of any kind calls these directly.
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY(v_both)
  LOOP
    -- PUBLIC must be included or anon keeps EXECUTE by inheritance; see header.
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    v_count := v_count + 1;
  END LOOP;

  -- Revoked from anon only: these are real authenticated-user features.
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY(v_anon)
  LOOP
    -- Grant authenticated explicitly FIRST: these functions reach authenticated only via the
    -- PUBLIC default, so revoking PUBLIC without this would disable the active-devices UI.
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'revoked EXECUTE on % function signatures', v_count;
END
$migration$;
