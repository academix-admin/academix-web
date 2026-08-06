-- schema:   public
-- function: get_question_exists(p_name text, p_user_id uuid, p_topic_id uuid, p_public boolean, p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_question_exists(p_name text, p_user_id uuid, p_topic_id uuid, p_public boolean, p_locale text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    is_personal BOOLEAN;
    check_public BOOLEAN;
    exists BOOLEAN;
    topic_text TEXT;
    norm_name TEXT;
    v_view_locale TEXT;
    v_locale TEXT;
BEGIN
    -- [idor-guard] same rule as assert_can_contribute — only a service-role caller may supply p_user_id.
    IF NOT (coalesce(auth.jwt()->>'role', '') = 'service_role' OR session_user IN ('service_role', 'postgres')) THEN
      p_user_id := auth.uid();
    END IF;
    IF p_user_id IS NULL THEN
      RETURN jsonb_build_object('is_public', false, 'exists', NULL, 'allowed', false, 'topic', null);
    END IF;

    -- Normalize input question text
    norm_name := UNACCENT(LOWER(TRIM(BOTH ' ' FROM REGEXP_REPLACE(p_name, '\?$', '', 'g'))));

    -- v_view_locale = what they SEE existing content in (always their registered language).
    -- v_locale = what they SUBMIT under: their registered language, UNLESS they're a verified
    -- translator, in which case it's their translation_language_id (the other half of the en->fr
    -- pair). Never the client-sent p_locale.
    SELECT
        rt.roles_is_personal_entry,
        LOWER(lt.language_code),
        LOWER(COALESCE(
            CASE WHEN ut.translation_language_verified THEN tlt.language_code END,
            lt.language_code
        ))
      INTO is_personal, v_view_locale, v_locale
    FROM users_table ut
    LEFT JOIN roles_table rt ON rt.roles_id = ut.roles_id
    LEFT JOIN language_table lt ON lt.language_id = ut.language_id
    LEFT JOIN language_table tlt ON tlt.language_id = ut.translation_language_id
    WHERE ut.users_id = p_user_id;

    IF v_view_locale IS NOT NULL THEN
        SELECT (translate(topics_identity, v_view_locale)).translation INTO topic_text
        FROM topics_table
        WHERE topics_id = p_topic_id;
    END IF;

    -- Fail early if data is invalid
    IF is_personal IS NULL OR v_locale IS NULL OR topic_text IS NULL THEN
        RETURN jsonb_build_object(
            'is_public', false,
            'exists', NULL,
            'allowed', false,
            'topic', null
        );
    ELSIF is_personal = TRUE THEN
        check_public := COALESCE(p_public, FALSE);
    ELSE
        check_public := TRUE;
    END IF;

    -- Check if normalized question text already exists, keyed under the resolved submission
    -- locale — not the client-sent p_locale.
    IF check_public = TRUE THEN
        SELECT EXISTS (
            SELECT 1 FROM questions_table qt
            WHERE EXISTS (
                SELECT translation FROM translate(qt.questions_identity, v_locale)
                WHERE UNACCENT(LOWER(TRIM(BOTH ' ' FROM REGEXP_REPLACE(translation, '\?$', '', 'g')))) = norm_name
            )
        ) INTO exists;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM questions_table qt
            WHERE EXISTS (
                SELECT translation FROM translate(qt.questions_identity, v_locale)
                WHERE UNACCENT(LOWER(TRIM(BOTH ' ' FROM REGEXP_REPLACE(translation, '\?$', '', 'g')))) = norm_name
            )
            AND (SELECT (translation::uuid) FROM translate(qt.questions_created_by, v_locale)) = p_user_id
        ) INTO exists;
    END IF;

    RETURN jsonb_build_object(
        'is_public', check_public,
        'exists', exists,
        'allowed', true,
        'topic', topic_text,
        'registered_locale', v_locale
    );
END;
$function$;


REVOKE EXECUTE ON FUNCTION public.get_question_exists(text, uuid, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_question_exists(text, uuid, uuid, boolean, text) TO service_role;
