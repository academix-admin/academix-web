-- schema: public
-- function: revoke_my_session(p_session_id) — the user "logs out" one of their devices.
-- Deletes that device's auth.sessions row (the session gate then refuses it as 'session_revoked') AND
-- its session_locks (app-lock) row, so no orphaned lock lingers. Scoped to the caller's own rows.
-- The client (hardLocalSignOut on web, signOut in the Flutter app) also calls this for the CURRENT
-- session on manual logout, so a signed-out device stops showing in get_my_sessions instead of
-- leaving a stale row — and, more importantly, so a leaked copy of that JWT stops passing the gate.
--
-- Emits a `session.revoked` audit event (ACADEMIX_PLAN Part VI, Q10). Recorded HERE, at the SQL
-- layer, rather than in each client: that way it is captured no matter which surface triggered the
-- revocation — app, web, or a future admin tool — and cannot be omitted by a caller that forgets.
CREATE OR REPLACE FUNCTION public.revoke_my_session(p_session_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'auth', 'public'
AS $function$
DECLARE
  v_deleted boolean;
BEGIN
  WITH del AS (
    DELETE FROM auth.sessions WHERE id = p_session_id AND user_id = auth.uid() RETURNING 1
  ), lock AS (
    DELETE FROM public.session_locks WHERE session_id = p_session_id AND user_id = auth.uid()
  )
  SELECT EXISTS(SELECT 1 FROM del) INTO v_deleted;

  -- Only log a revocation that actually happened: a no-op call (wrong id, or someone else's
  -- session) must not create a misleading audit entry.
  IF v_deleted THEN
    PERFORM public.log_security_event(
      'session.revoked', auth.uid(), p_session_id, 'system', NULL, NULL,
      jsonb_build_object('self_initiated', true)
    );
  END IF;

  RETURN v_deleted;
END;
$function$;
