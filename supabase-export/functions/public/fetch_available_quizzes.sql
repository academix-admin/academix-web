-- schema:   public
-- function: fetch_available_quizzes(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_type text, p_limit_by integer, p_after_quiz_topics jsonb, p_search_key text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_available_quizzes(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_type text, p_limit_by integer, p_after_quiz_topics jsonb, p_search_key text DEFAULT NULL::text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    sortID    TEXT;
    direction TEXT;
BEGIN
    sortID    := (p_after_quiz_topics->>'sort_id')::TEXT;
    direction := (p_after_quiz_topics->>'direction')::TEXT;

    RETURN QUERY
    WITH
    followed_creators AS (
        SELECT users_creator_id
        FROM users_followers_table
        WHERE users_id = p_user_id
    ),
    personalized_topic_ids AS (
        SELECT topics_id
        FROM personalized_table
        WHERE users_id = p_user_id
    ),

    cheap_candidates AS NOT MATERIALIZED (
        SELECT
            tt.*,
            cr.creator_id,
            t_identity.translation AS translated_identity,        -- ← moved here
            (fc.users_creator_id IS NOT NULL) AS creator_is_followed,
            (pt.topics_id IS NOT NULL)        AS topic_is_personalised
        FROM topics_table tt

        CROSS JOIN LATERAL (
            SELECT translation::uuid AS creator_id
            FROM translate(tt.topics_created_by, p_locale)
        ) cr

        CROSS JOIN LATERAL translate(tt.topics_identity, p_locale) AS t_identity  -- ← moved here

        LEFT JOIN followed_creators      fc ON fc.users_creator_id = cr.creator_id
        LEFT JOIN personalized_topic_ids pt ON pt.topics_id        = tt.topics_id

        WHERE
            (sortID IS NULL OR (
                (direction = 'oldest' AND tt.sort_updated_id::TEXT < sortID)
                OR (direction = 'latest' AND tt.sort_updated_id::TEXT > sortID)
            ))
            AND (p_type <> 'creator'      OR fc.users_creator_id IS NOT NULL)
            AND (p_type =  'creator'      OR fc.users_creator_id IS NULL)
            AND (p_type <> 'public'       OR pt.topics_id IS NULL)
            AND (p_type <> 'personalized' OR pt.topics_id IS NOT NULL)
            AND (                                                   -- ← search filter applied early
                p_search_key IS NULL
                OR t_identity.translation ILIKE '%' || p_search_key || '%'
            )

        ORDER BY
            CASE
                WHEN direction = 'latest' THEN tt.sort_updated_id::TEXT
                ELSE NULL
            END ASC NULLS LAST,
            CASE
                WHEN direction = 'oldest' OR direction IS NULL THEN tt.sort_updated_id::TEXT
                ELSE NULL
            END DESC NULLS LAST
    ),

    enriched_candidates AS NOT MATERIALIZED (
        SELECT
            cc.*,
            t_status.translation AS status,
            d_lang.value         AS lang_value,
            d_country.value      AS country_value,
            d_gender.value       AS gender_value,
            d_age.value          AS age_value
        FROM cheap_candidates cc

        CROSS JOIN LATERAL translate(cc.approval_status,  p_locale)            AS t_status
        CROSS JOIN LATERAL decontrol(cc.language_control, p_locale,  p_locale) AS d_lang
        CROSS JOIN LATERAL decontrol(cc.country_control,  p_country, p_locale) AS d_country
        CROSS JOIN LATERAL decontrol(cc.gender_control,   p_gender,  p_locale) AS d_gender
        CROSS JOIN LATERAL decontrol(cc.age_control,      p_age,     p_locale) AS d_age
    ),

    filtered_topics AS (
        SELECT ec.*
        FROM enriched_candidates ec
        WHERE
            (SELECT * FROM get_quiz_content_check(
                ec.creator_id,
                p_user_id,
                ec.translated_identity,
                ec.lang_value,
                ec.country_value,
                ec.gender_value,
                ec.age_value,
                ec.topics_visible,
                ec.status
            )) = true
            AND (SELECT * FROM get_quiz_available(
                p_user_id, ec.topics_id, p_locale, p_country, p_gender, p_age
            )) = true

        LIMIT p_limit_by
    )

    SELECT jsonb_build_object(
        'topics_id',             ft.topics_id,
        'topics_created_at',     ft.topics_created_at,
        'topics_updated_at',     ft.topics_updated_at,
        'sort_created_id',       ft.sort_created_id,
        'sort_updated_id',       ft.sort_updated_id,
        'topics_identity',       ft.translated_identity,
        'topics_image',          ft.topics_image,
        'pools_details',         get_pool_details(p_user_id, ft.topics_id, p_locale, p_country, p_gender, p_age),
        'creator_details',       get_user_fields(ft.creator_id, ARRAY['users_id', 'users_names', 'users_username', 'users_image']),
        'creator_is_followed',   ft.creator_is_followed,
        'topic_is_personalised', ft.topic_is_personalised
    )
    FROM filtered_topics ft;
END;
$function$

