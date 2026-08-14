-- =====================================================================================
-- HOTFIX: restore EXECUTE on functions that SECURITY INVOKER callers depend on.
-- Reverts part of _revoke_definer_execute_migration.sql (Q37).
--
-- WHAT BROKE
-- Q37 revoked EXECUTE from anon/authenticated on 12 SECURITY DEFINER functions, reasoning that
-- "these are only called from inside other functions, and a nested call runs in the enclosing
-- function's security context, so the client's own grant is irrelevant."
--
-- That is true ONLY when the caller is SECURITY DEFINER. A SECURITY INVOKER caller runs as the
-- CALLING role, so its nested call needs the CALLER's grant — exactly the one that was removed.
--
-- gate_check has 28 SECURITY INVOKER callers. Revoking it broke every one of them for browser
-- clients. Observed live:
--
--   POST /rest/v1/rpc/get_user_missions_count
--   -> {"error": "permission denied for function gate_check",
--       "status": "MissionStatus.error", "mission_data": null}
--
-- The calling RPCs swallow that into their own status field, so the browser sees a null payload
-- rather than an error, and the affected UI simply renders nothing. The Rewards page's Milestone
-- view disappearing is how this surfaced — silent, and nowhere near the change that caused it.
--
-- WHAT IS RESTORED, AND WHAT IS NOT
-- Only the two with INVOKER callers:
--     gate_check          28 invoker callers
--     assert_can_review    3 invoker callers
-- The other ten revoked in Q37 have only DEFINER callers (or none), so their revoke was correct
-- and stands:
--     assert_allowed_region, gate_new_session, handle_new_user, ingest_ip_geo,
--     notify_new_session, notify_secret, region_block_status, request_ip_geo,
--     resolve_ip_geo, session_gate_status
--
-- PUBLIC is included deliberately: these functions carried the default PUBLIC grant before Q37,
-- and several of the 28 callers are reachable pre-auth (the country gate runs before sign-in).
-- Granting only `authenticated` would leave the anon paths broken in a subtler way.
--
-- LESSON FOR ANY FUTURE REVOKE
-- "Who calls this?" is not enough. The question is "is the caller DEFINER or INVOKER?" — only a
-- DEFINER caller insulates a callee from the client's grants.
-- =====================================================================================

DO $migration$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('gate_check', 'assert_can_review')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC, anon, authenticated', r.sig);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'restored EXECUTE on % signatures', v_count;
END
$migration$;
