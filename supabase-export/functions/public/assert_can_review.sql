-- schema:   public
-- function: assert_can_review(p_user_id) — server-authoritative role gate for evaluate_category/
-- evaluate_topic/evaluate_question. RAISES (42501) unless the ACTING user has roles_checker IN
-- ('Roles.reviewer','Roles.academix_reviewer') — added 2026-08-06 because those three RPCs
-- previously had NO role check at all (any authenticated user, including a plain student, could
-- approve/reject/reserve any content). Service callers act as p_user_id; any other caller acts as
-- auth.uid(), so a client can never spoof p_user_id to review as someone else.
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.assert_can_review(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_checker text;
BEGIN
  -- Same identity rule as assert_can_contribute: only a genuine service-role caller may supply
  -- p_user_id directly; everyone else acts as their own auth.uid().
  IF NOT (coalesce(auth.jwt()->>'role', '') = 'service_role' OR session_user IN ('service_role', 'postgres')) THEN
    p_user_id := auth.uid();
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authorized: unauthenticated' USING errcode = '42501';
  END IF;

  SELECT rt.roles_checker INTO v_checker
  FROM users_table ut
  JOIN roles_table rt ON rt.roles_id = ut.roles_id
  WHERE ut.users_id = p_user_id;

  IF v_checker IS NULL OR v_checker NOT IN ('Roles.reviewer', 'Roles.academix_reviewer') THEN
    RAISE EXCEPTION 'not_authorized: review requires the reviewer role'
      USING errcode = '42501';
  END IF;
END;
$function$;
