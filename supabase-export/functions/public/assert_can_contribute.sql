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
  v_level    int;
  v_personal boolean;
  v_checker  text;
  v_translation_language_id uuid;
  v_translation_verified boolean;
BEGIN
  -- [idor-guard] a JWT caller acts as their own id; ONLY a genuine service-role caller (the content
  -- Lambdas, which pass an authorizer-verified id) may supply p_user_id directly — checked via
  -- session_user/JWT role, not just "auth.uid() happens to be null" (that was also true for a fully
  -- anonymous PostgREST caller, who could previously pass ANY p_user_id and forge content as them).
  IF NOT (coalesce(auth.jwt()->>'role', '') = 'service_role' OR session_user IN ('service_role', 'postgres')) THEN
    p_user_id := auth.uid();
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authorized: unauthenticated' USING errcode = '42501';
  END IF;

  SELECT rt.roles_level, rt.roles_is_personal_entry, rt.roles_checker,
         ut.translation_language_id, ut.translation_language_verified
    INTO v_level, v_personal, v_checker, v_translation_language_id, v_translation_verified
  FROM users_table ut
  JOIN roles_table rt ON rt.roles_id = ut.roles_id
  WHERE ut.users_id = p_user_id;

  IF v_level IS NULL OR v_level < 2 THEN
    RAISE EXCEPTION 'not_authorized: contribution requires a creator or higher role'
      USING errcode = '42501';
  END IF;

  -- A translator's whole purpose is to submit the OTHER half of a registered-language ->
  -- translation-language pair. Until that pairing is set AND verified, they can't contribute at
  -- all under this role (never silently fall back to treating them as a plain same-language
  -- creator — that would submit content attributed to the translator role without an actual
  -- verified translation capability behind it).
  IF v_checker = 'Roles.translator' AND (v_translation_language_id IS NULL OR NOT COALESCE(v_translation_verified, false)) THEN
    RAISE EXCEPTION 'not_authorized: translation language pairing is not verified yet'
      USING errcode = '42501';
  END IF;

  -- Role assignment and payment are separate: a user can select the creator/reviewer/translator
  -- role before paying its buy-in. fetch_user_activation_status is the single source of truth for
  -- "has this role actually been paid + confirmed" — round it up here so contribution requires both.
  IF NOT public.fetch_user_activation_status(p_user_id) THEN
    RAISE EXCEPTION 'not_authorized: role is not yet activated (payment not completed)'
      USING errcode = '42501';
  END IF;

  IF COALESCE(p_visibility, 'public') = 'private' AND COALESCE(v_personal, false) = false THEN
    RAISE EXCEPTION 'not_authorized: this role cannot create private content'
      USING errcode = '42501';
  END IF;
END;
$function$;


REVOKE EXECUTE ON FUNCTION public.assert_can_contribute(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_can_contribute(uuid, text) TO service_role;
