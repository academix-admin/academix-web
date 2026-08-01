-- schema:   public
-- function: assert_can_contribute(p_user_id, p_visibility) — server-authoritative role gate for the
-- Academix Engine contribution paths (Academix_Engine_plan §2.4). RAISES (42501) unless the ACTING user
-- is a contributor (roles_level >= 2), and — for private content — a role that can hold personal entries
-- (roles_is_personal_entry). Service callers (the content Lambdas, authorizer-verified) act as p_user_id;
-- ANY other caller acts as auth.uid(), so a client (e.g. a student) can NEVER contribute — nor spoof
-- p_user_id to act as someone else. Call at the top of every authoring RPC/Lambda.
CREATE OR REPLACE FUNCTION public.assert_can_contribute(p_user_id uuid DEFAULT NULL::uuid, p_visibility text DEFAULT 'public'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service  boolean := (auth.jwt() ->> 'role') = 'service_role' OR session_user IN ('service_role','supabase_auth_admin','postgres');
  v_uid      uuid    := CASE WHEN v_service AND p_user_id IS NOT NULL THEN p_user_id ELSE auth.uid() END;
  v_level    int;
  v_personal boolean;
BEGIN
  SELECT rt.roles_level, rt.roles_is_personal_entry
    INTO v_level, v_personal
  FROM users_table ut
  JOIN roles_table rt ON rt.roles_id = ut.roles_id
  WHERE ut.users_id = v_uid;

  IF v_level IS NULL OR v_level < 2 THEN
    RAISE EXCEPTION 'not_authorized: contribution requires a creator or higher role'
      USING errcode = '42501';
  END IF;

  IF COALESCE(p_visibility, 'public') = 'private' AND COALESCE(v_personal, false) = false THEN
    RAISE EXCEPTION 'not_authorized: this role cannot create private content'
      USING errcode = '42501';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.assert_can_contribute(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assert_can_contribute(uuid, text) TO authenticated, service_role;
