-- schema:   public
-- function: fetch_topics(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_after_topics jsonb, p_type text, p_category_id uuid, p_reviewer_tab text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_topics(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_after_topics jsonb, p_type text, p_category_id uuid DEFAULT NULL::uuid, p_reviewer_tab text DEFAULT NULL::text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sortID TEXT;
BEGIN
    sortID := (p_after_topics->>'sort_id')::TEXT;
    
    RETURN QUERY
    WITH filtered_topics AS (
        SELECT 
            tt.topics_id,
            tt.topics_created_at,
            tt.topics_updated_at,
            tt.sort_created_id,
            tt.sort_updated_id,
            tt.topics_identity,
            tt.topic_category_id,
            tt.age_control,
            tt.country_control,
            tt.language_control,
            tt.gender_control,
            tt.topics_visible,
            tt.topics_image,
            tst.topic_is_favourite,
            tst.topic_is_recent,
            tst.topic_settings_updated_at,
            tst.sort_updated_id AS settings_sort_id,
            tt.approval_status,
            (SELECT translation::uuid FROM translate(tt.topics_created_by, p_locale)) AS users_creator_id,
            (SELECT translation::uuid FROM translate(tt.topics_reviewed_by, p_locale)) AS users_reviewer_id
        FROM topics_table tt
        LEFT JOIN topic_settings_table tst ON tt.topics_id = tst.topics_id
        WHERE 
            (SELECT * FROM fetch_general_content_check(
                (SELECT translation::uuid FROM translate(tt.topics_created_by, p_locale)),
                p_user_id,
                (SELECT translation FROM translate(tt.topics_identity, p_locale)),
                (SELECT translation::uuid FROM translate(tt.topics_reviewed_by, p_locale)),
                (SELECT value FROM decontrol(tt.language_control, p_locale)),
                (SELECT value FROM decontrol(tt.country_control, p_country)),
                (SELECT value FROM decontrol(tt.gender_control, p_gender)),
                (SELECT value FROM decontrol(tt.age_control, p_age)),
                tt.topics_visible,
                (SELECT translation FROM translate(tt.approval_status, p_locale))
            )) = true

            AND (p_category_id = tt.topic_category_id::uuid OR p_type = 'reviewer')

            AND (p_type <> 'reviewer' OR (p_type = 'reviewer' 
                AND p_reviewer_tab IS NOT NULL 
                AND get_approval_checker(
                    p_user_id,
                    p_reviewer_tab,
                    (SELECT translation FROM translate(tt.approval_status, p_locale)),
                    (SELECT translation::uuid FROM translate(tt.topics_reviewed_by, p_locale))
                ) = true))

            AND (p_type <> 'creator' OR (p_type = 'creator' 
                AND (SELECT translation::uuid FROM translate(tt.topics_created_by, p_locale)) <> p_user_id))

            AND (p_type <> 'private' OR (p_type = 'private' 
                AND (SELECT translation::uuid FROM translate(tt.topics_created_by, p_locale)) = p_user_id
                AND (sortID IS NULL OR tt.sort_created_id::text < sortID::text)
                AND tst.topic_is_favourite::boolean <> true
                AND (tt.topics_updated_at::timestamptz <= NOW() - INTERVAL '7 days'
                    OR tt.topics_updated_at::timestamptz IS NULL)
            ))

            AND (p_type <> 'favourite' OR (p_type = 'favourite' 
                AND (SELECT translation::uuid FROM translate(tt.topics_created_by, p_locale)) = p_user_id
                AND tst.topic_is_favourite::boolean = true
                AND (sortID IS NULL OR tst.sort_updated_id::text < sortID::text)
            ))

            AND (p_type <> 'recent' OR (p_type = 'recent' 
                AND (SELECT translation::uuid FROM translate(tt.topics_created_by, p_locale)) = p_user_id
                AND tt.topics_updated_at::timestamptz IS NOT NULL
                AND tt.topics_updated_at::timestamptz > NOW() - INTERVAL '7 days'
                AND (sortID IS NULL OR tt.sort_updated_id::text < sortID::text)
            ))

            AND (p_type NOT IN ('creator', 'reviewer') OR (p_type IN ('creator', 'reviewer') 
                AND (sortID IS NULL OR tt.sort_updated_id::text < sortID::text)
            ))

        ORDER BY 
            CASE WHEN p_type IN ('reviewer', 'creator', 'recent') THEN tt.sort_updated_id::text ELSE NULL END DESC,
            CASE WHEN p_type = 'private' THEN tt.sort_created_id::text ELSE NULL END DESC,
            CASE WHEN p_type = 'favourite' THEN tst.sort_updated_id::text ELSE NULL END DESC
        LIMIT p_limit_by
    )
    SELECT
        jsonb_build_object(
            'topics_id', ft.topics_id,
            'topics_image', ft.topics_image,
            'topics_created_at', ft.topics_created_at,
            'topics_updated_at', ft.topics_updated_at,
            'sort_created_id', ft.sort_created_id,
            'sort_updated_id', ft.sort_updated_id,
            'topics_identity', (SELECT translation FROM translate(ft.topics_identity, p_locale)),
            'approval', (SELECT translation FROM translate(ft.approval_status, p_locale)),
            'reviewer_id', ft.users_reviewer_id,
            'topic_category_id', ft.topic_category_id,
            'user_created_question', (SELECT COUNT(questions_id) FROM questions_table 
                                      WHERE topics_id = ft.topics_id 
                                      AND users_creator_id = p_user_id),
            'general_questions', (SELECT COUNT(questions_id) FROM questions_table 
                                  WHERE topics_id = ft.topics_id),
            'topic_settings', jsonb_build_object(
                'is_favourite', ft.topic_is_favourite,
                'is_recents', ft.topic_is_recent,
                'settings_updated_at', ft.topic_settings_updated_at
            ),
            'creator_details', get_user_fields(
                ft.users_creator_id,
                ARRAY['users_id', 'users_names', 'users_username', 'users_image']
            ),
            'age_control', (SELECT jsonb_agg(control) FROM build_control(ft.age_control, p_locale) AS control),
            'country_control', (SELECT jsonb_agg(control) FROM build_control(ft.country_control, p_locale) AS control),
            'language_control', (SELECT jsonb_agg(control) FROM build_control(ft.language_control, p_locale) AS control),
            'gender_control', (SELECT jsonb_agg(control) FROM build_control(ft.gender_control, p_locale) AS control)
        )
    FROM filtered_topics ft;
END;
$function$

