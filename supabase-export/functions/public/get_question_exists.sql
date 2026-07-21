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
BEGIN
    -- Normalize input question text
    norm_name := UNACCENT(LOWER(TRIM(BOTH ' ' FROM REGEXP_REPLACE(p_name, '\?$', '', 'g'))));

    -- Get user role type (personal vs non-personal)
    SELECT rt.roles_is_personal_entry INTO is_personal
    FROM users_table ut 
    LEFT JOIN roles_table rt ON rt.roles_id = ut.roles_id
    WHERE ut.users_id = p_user_id;

    -- Get localized topic translation
    SELECT (translate(topics_identity, p_locale)).translation INTO topic_text 
    FROM topics_table
    WHERE topics_id = p_topic_id;

    -- Fail early if data is invalid
    IF is_personal IS NULL OR topic_text IS NULL THEN 
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

    -- Check if normalized question text already exists
    IF check_public = TRUE THEN 
        SELECT EXISTS (
            SELECT 1 FROM questions_table qt
            WHERE EXISTS (
                SELECT translation FROM translate(qt.questions_identity, p_locale)
                WHERE UNACCENT(LOWER(TRIM(BOTH ' ' FROM REGEXP_REPLACE(translation, '\?$', '', 'g')))) = norm_name
            )
        ) INTO exists;
    ELSE 
        SELECT EXISTS (
            SELECT 1 FROM questions_table qt
            WHERE EXISTS (
                SELECT translation FROM translate(qt.questions_identity, p_locale) 
                WHERE UNACCENT(LOWER(TRIM(BOTH ' ' FROM REGEXP_REPLACE(translation, '\?$', '', 'g')))) = norm_name
            )
            AND (SELECT (translation::uuid) FROM translate(qt.questions_created_by, p_locale)) = p_user_id
        ) INTO exists;
    END IF;

    RETURN jsonb_build_object(
        'is_public', check_public,
        'exists', exists,
        'allowed', true,
        'topic', topic_text
    );
END;
$function$

