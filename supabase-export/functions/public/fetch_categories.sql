-- schema:   public
-- function: fetch_categories(p_locale, p_type, p_limit_by, p_after_categories, p_reviewer_tab)
-- identity + demographics (user_id/country/gender/age) are derived server-side via gate_check, NOT client-sent.
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

-- p_search_key added (SearchViewer server search on the category name). New param → new signature, so the
-- old 5-arg overload is dropped and EXECUTE re-granted below.
DROP FUNCTION IF EXISTS public.fetch_categories(text, text, integer, jsonb, text);

CREATE OR REPLACE FUNCTION public.fetch_categories(p_locale text, p_type text, p_limit_by integer, p_after_categories jsonb, p_reviewer_tab text DEFAULT NULL::text, p_search_key text DEFAULT NULL::text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sortID TEXT;
    p_user_id uuid;
    p_country text;
    p_gender  text;
    p_age     text;
    v_own_locale text;
    v_locale text;
BEGIN
    -- [gate] server-authoritative identity + demographics (never client-sent), same as the money RPCs
    -- (fetch_user_top_up_wallet / get_active_quiz). Prevents spoofing country/gender/age to bypass gating.
    SELECT users_id, country, gender, age INTO p_user_id, p_country, p_gender, p_age
    FROM public.gate_check(NULL, p_locale);
    sortID := (p_after_categories->>'sort_id')::TEXT;

    -- "My own content" tabs (creator/reviewer/private/favourite/recent) must key off the CALLER'S
    -- own language, never the client-sent p_locale (their current display language) — otherwise
    -- switching display language makes a creator's/reviewer's own library silently disappear (their
    -- content is stored under their registered/translation locale, not whatever p_locale happens to
    -- be). Verified translators use their translation_language_id (the locale they submit INTO);
    -- everyone else uses their registered language_id. General/public browsing still uses p_locale
    -- (a viewer picking which language to read content in is a different, legitimate concern).
    IF p_type IN ('creator', 'reviewer', 'private', 'favourite', 'recent') THEN
        SELECT LOWER(COALESCE(
            CASE WHEN ut.translation_language_verified THEN tlt.language_code END,
            lt.language_code
        )) INTO v_own_locale
        FROM users_table ut
        LEFT JOIN language_table lt ON lt.language_id = ut.language_id
        LEFT JOIN language_table tlt ON tlt.language_id = ut.translation_language_id
        WHERE ut.users_id = p_user_id;
        v_locale := COALESCE(v_own_locale, p_locale);
    ELSE
        v_locale := p_locale;
    END IF;

    RETURN QUERY
    WITH filtered_categories AS (
        SELECT
            tct.topic_category_id,
            tct.topic_category_created_at,
            tct.topic_category_updated_at,
            tct.topic_category_identity,
            tct.topic_category_image,
            tct.sort_created_id AS tct_sort_created_id,
            tct.sort_updated_id AS tct_sort_updated_id,
            tct.language_control,
            tct.country_control,
            tct.gender_control,
            tct.age_control,
            tst.topic_is_favourite,
            tst.topic_is_recent,
            tst.topic_settings_updated_at,
            tst.sort_created_id AS tst_sort_created_id,
            tst.sort_updated_id AS tst_sort_updated_id,
            tct.approval_status,
            (SELECT translation::uuid FROM translate(tct.topic_category_created_by, v_locale)) AS users_creator_id,
            (SELECT translation::uuid FROM translate(tct.topic_category_reviewed_by, v_locale)) AS users_reviewer_id
        FROM topic_category_table tct
        LEFT JOIN topic_settings_table tst ON tct.topic_category_id = tst.topic_category_id
        WHERE
        ((SELECT translation FROM translate(tct.topic_category_identity, v_locale)) IS NOT NULL)
            AND (p_search_key IS NULL OR p_search_key = '' OR
                 (SELECT translation FROM translate(tct.topic_category_identity, v_locale)) ILIKE '%' || p_search_key || '%')
            AND
            (SELECT * FROM fetch_general_content_check(
                (SELECT translation::uuid FROM translate(tct.topic_category_created_by, v_locale)),
                p_user_id,
                'category'::TEXT,
                (SELECT translation::uuid FROM translate(tct.topic_category_reviewed_by, v_locale)),
                (SELECT value FROM decontrol(tct.language_control, v_locale, v_locale)),
                (SELECT value FROM decontrol(tct.country_control, p_country, v_locale)),
                (SELECT value FROM decontrol(tct.gender_control, p_gender, v_locale)),
                (SELECT value FROM decontrol(tct.age_control, p_age, v_locale)),
                tct.topic_category_visible,
                (SELECT translation FROM translate(tct.approval_status, v_locale))
            )) = true

            AND (p_type <> 'reviewer' OR (p_type = 'reviewer'
                AND p_reviewer_tab IS NOT NULL
                AND get_approval_checker(
                    p_user_id,
                    p_reviewer_tab,
                    (SELECT translation FROM translate(tct.approval_status, v_locale)),
                    (SELECT translation::uuid FROM translate(tct.topic_category_reviewed_by, v_locale))
                ) = true))

            AND (p_type <> 'creator' OR (p_type = 'creator'
                AND (SELECT translation::uuid FROM translate(tct.topic_category_created_by, v_locale)) <> p_user_id))

            AND (p_type <> 'private' OR (p_type = 'private'
                AND (SELECT translation::uuid FROM translate(tct.topic_category_created_by, v_locale)) = p_user_id
                AND (sortID IS NULL OR tct.sort_created_id::text < sortID::text)
                AND tst.topic_is_favourite::boolean <> true
                AND (tct.topic_category_updated_at::timestamptz <= NOW() - INTERVAL '7 days'
                    OR tct.topic_category_updated_at::timestamptz IS NULL)
            ))

            AND (p_type <> 'favourite' OR (p_type = 'favourite'
                AND (SELECT translation::uuid FROM translate(tct.topic_category_created_by, v_locale)) = p_user_id
                AND tst.topic_is_favourite::boolean = true
                AND (sortID IS NULL OR tst.sort_updated_id::text < sortID::text)
            ))

            AND (p_type <> 'recent' OR (p_type = 'recent'
                AND (SELECT translation::uuid FROM translate(tct.topic_category_created_by, v_locale)) = p_user_id
                AND tct.topic_category_updated_at::timestamptz IS NOT NULL
                AND tct.topic_category_updated_at::timestamptz > NOW() - INTERVAL '7 days'
                AND (sortID IS NULL OR tct.sort_updated_id::text < sortID::text)
            ))

            AND (p_type NOT IN ('creator', 'reviewer') OR (p_type IN ('creator', 'reviewer')
                AND (sortID IS NULL OR tct.sort_updated_id::text < sortID::text)
            ))

        ORDER BY
            CASE WHEN p_type IN ('reviewer', 'creator', 'recent') THEN tct.sort_updated_id::text ELSE NULL END DESC,
            CASE WHEN p_type = 'private' THEN tct.sort_created_id::text ELSE NULL END DESC,
            CASE WHEN p_type = 'favourite' THEN tst.sort_updated_id::text ELSE NULL END DESC
        LIMIT p_limit_by
    )
    SELECT
        jsonb_build_object(
            'topic_category_id', fc.topic_category_id,
            'topic_category_image', fc.topic_category_image,
            'topic_category_created_at', fc.topic_category_created_at,
            'topic_category_updated_at', fc.topic_category_updated_at,
            'topic_category_identity', (SELECT translation FROM translate(fc.topic_category_identity, v_locale)),
            'sort_created_id', fc.tct_sort_created_id,
            'sort_updated_id', fc.tct_sort_updated_id,
            'reviewer_id', fc.users_reviewer_id,
            'approval', (SELECT translation FROM translate(fc.approval_status, v_locale)),
            'user_created_topic', (SELECT COUNT(topics_id) FROM topics_table
                                   WHERE topic_category_id = fc.topic_category_id
                                   AND users_creator_id = p_user_id),
            'user_created_question', (SELECT COUNT(questions_id) FROM questions_table
                                      WHERE topic_category_id = fc.topic_category_id
                                      AND users_creator_id = p_user_id),
            'topic_settings', jsonb_build_object(
                'is_favourite', fc.topic_is_favourite,
                'is_recents', fc.topic_is_recent,
                'settings_updated_at', fc.topic_settings_updated_at
            ),
            'creator_details', get_user_fields(
                fc.users_creator_id,
                ARRAY['users_id', 'users_names', 'users_username', 'users_image']
            ),
            'age_control', (SELECT jsonb_agg(control) FROM build_control(fc.age_control, v_locale) AS control),
            'country_control', (SELECT jsonb_agg(control) FROM build_control(fc.country_control, v_locale) AS control),
            'language_control', (SELECT jsonb_agg(control) FROM build_control(fc.language_control, v_locale) AS control),
            'gender_control', (SELECT jsonb_agg(control) FROM build_control(fc.gender_control, v_locale) AS control)
        )
    FROM filtered_categories fc;
END;
$function$;

REVOKE ALL ON FUNCTION public.fetch_categories(text, text, integer, jsonb, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fetch_categories(text, text, integer, jsonb, text, text) TO authenticated, service_role;
