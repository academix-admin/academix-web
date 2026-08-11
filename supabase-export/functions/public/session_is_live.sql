-- schema: public
-- function: session_is_live(p_session_id) — is this session still valid, or has it been revoked?
--
-- WHY THIS EXISTS (ACADEMIX_PLAN Part V, S1)
-- The API Gateway authorizer (supabase_flutter_authorizer) only verifies the JWT's signature and
-- expiry, and its own comment says revocation "must be checked in the (uncached) handler, not here"
-- — because the authorizer response is CACHED per token. No handler ever did that check, so after
-- "log out this device" the revoked device kept full access to every Lambda endpoint, including the
-- money ones, for the remaining lifetime of its access token. PostgREST was correctly refusing it
-- the whole time (public.enforce_session), which made the gap easy to miss.
--
-- public.session_gate_status() cannot be reused here: it reads request.jwt.claims, which is not set
-- on a service_role call from a Lambda. Hence an explicit session_id parameter.
--
-- Deliberately narrow: it answers only "does this session row still exist". App-lock state is NOT
-- consulted, because the Lambdas are what CLEAR the app-lock (verify_academix_pin -> session_unlock);
-- refusing a locked session here would make the lock unclearable.
CREATE OR REPLACE FUNCTION public.session_is_live(p_session_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'auth', 'public'
AS $function$
  SELECT EXISTS(SELECT 1 FROM auth.sessions WHERE id = p_session_id);
$function$;

-- service_role only: this is a backend-to-backend check. Never expose it to clients — it would let
-- anyone probe which session ids exist.
REVOKE ALL ON FUNCTION public.session_is_live(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.session_is_live(uuid) TO service_role;
