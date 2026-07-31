-- schema: public
-- function: revoke_my_session(p_session_id) — the user "logs out" one of their devices.
-- Deletes that device's auth.sessions row (the session gate then refuses it as 'session_revoked') AND
-- its session_locks (app-lock) row, so no orphaned lock lingers. Scoped to the caller's own rows.
-- The client (hardLocalSignOut) also calls this for the CURRENT session on manual logout, so a
-- signed-out device stops showing in get_my_sessions instead of leaving a stale row.
CREATE OR REPLACE FUNCTION public.revoke_my_session(p_session_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'auth', 'public'
AS $function$
  with del as (
    delete from auth.sessions where id = p_session_id and user_id = auth.uid() returning 1
  ), lock as (
    delete from public.session_locks where session_id = p_session_id and user_id = auth.uid()
  )
  select exists(select 1 from del);
$function$;
