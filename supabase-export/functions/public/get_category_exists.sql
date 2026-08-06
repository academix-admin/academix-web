-- schema:   public
-- function: get_category_exists(p_name text, p_user_id uuid, p_public boolean, p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_category_exists(p_name text, p_user_id uuid, p_public boolean, p_locale text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    is_personal BOOLEAN;
    check_public BOOLEAN;
    exists BOOLEAN;
    v_locale TEXT;
BEGIN
   -- [idor-guard] same rule as assert_can_contribute — only a service-role caller may supply p_user_id.
   IF NOT (coalesce(auth.jwt()->>'role', '') = 'service_role' OR session_user IN ('service_role', 'postgres')) THEN
     p_user_id := auth.uid();
   END IF;
   IF p_user_id IS NULL THEN
     RETURN jsonb_build_object('is_public', false, 'exists', NULL, 'allowed', false);
   END IF;

   -- The submission language is the creator's REGISTERED language — UNLESS they're a verified
   -- translator, in which case it's their translation_language_id (they submit the OTHER half of
   -- the en->fr pair). Never the client-sent p_locale (just whatever UI display language they're
   -- currently viewing in). translation_language_verified gates this — an unverified translator
   -- pairing falls back to the registered language like anyone else.
   SELECT
       rt.roles_is_personal_entry,
       LOWER(COALESCE(
           CASE WHEN ut.translation_language_verified THEN tlt.language_code END,
           lt.language_code
       ))
     INTO is_personal, v_locale
   FROM users_table ut
   LEFT JOIN roles_table rt ON rt.roles_id = ut.roles_id
   LEFT JOIN language_table lt ON lt.language_id = ut.language_id
   LEFT JOIN language_table tlt ON tlt.language_id = ut.translation_language_id
   WHERE ut.users_id = p_user_id;

   IF is_personal IS NULL OR v_locale IS NULL THEN
      RETURN jsonb_build_object(
        'is_public', false,
        'exists', NULL,
        'allowed', false
      );
   ELSIF is_personal = TRUE THEN
          check_public := COALESCE(p_public, FALSE);
   ELSE
         check_public := TRUE;
   END IF;

   -- Check if any value in the topic_category_identity JSONB matches p_name (by visibility),
   -- keyed under the resolved submission locale — not the client-sent p_locale.
   IF check_public = TRUE THEN
        SELECT EXISTS (
            SELECT 1 FROM topic_category_table tct
            WHERE EXISTS (
                SELECT translation FROM translate(tct.topic_category_identity, v_locale)
                WHERE UNACCENT(LOWER(translation)) = UNACCENT(LOWER(p_name))
            )
            AND tct.visibility = 'public'
        ) INTO exists;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM topic_category_table tct
            WHERE EXISTS (
                SELECT translation FROM translate(tct.topic_category_identity, v_locale)
                WHERE UNACCENT(LOWER(translation)) = UNACCENT(LOWER(p_name))
            )
            AND tct.visibility = 'private'
            AND (SELECT (translation::uuid) FROM translate(tct.topic_category_created_by, v_locale)) = p_user_id
        ) INTO exists;
     END IF;

    RETURN jsonb_build_object(
        'is_public', check_public,
        'exists', exists,
        'allowed', true,
        'registered_locale', v_locale
      );
END;
$function$;


REVOKE EXECUTE ON FUNCTION public.get_category_exists(text, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_category_exists(text, uuid, boolean, text) TO service_role;
