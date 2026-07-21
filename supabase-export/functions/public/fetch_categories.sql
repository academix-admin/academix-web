-- schema:   public
-- function: fetch_categories(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid, p_type text, p_limit_by integer, p_after_categories jsonb, p_reviewer_tab text, p_group_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_categories(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid, p_type text, p_limit_by integer, p_after_categories jsonb, p_reviewer_tab text DEFAULT NULL::text, p_group_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sortID TEXT;
BEGIN
    sortID := (p_after_categories->>'sort_id')::TEXT;

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
            cgt.category_group_id,
            cgt.category_group_identity,
            cgt.approval_status,
            (SELECT translation::uuid FROM translate(tct.topic_category_created_by, p_locale)) AS users_creator_id,
            (SELECT translation::uuid FROM translate(tct.topic_category_reviewed_by, p_locale)) AS users_reviewer_id
        FROM topic_category_table tct
        LEFT JOIN topic_settings_table tst ON tct.topic_category_id = tst.topic_category_id
        LEFT JOIN category_group_table cgt ON cgt.category_group_id = tct.category_group_id
        WHERE 
        ((SELECT translation FROM translate(tct.topic_category_identity, p_locale)) IS NOT NULL)
            AND
            (SELECT * FROM fetch_general_content_check(
                (SELECT translation::uuid FROM translate(tct.topic_category_created_by, p_locale)),
                p_user_id,
                'category'::TEXT,
                (SELECT translation::uuid FROM translate(tct.topic_category_reviewed_by, p_locale)),
                (SELECT value FROM decontrol(tct.language_control, p_locale, p_locale)),
                (SELECT value FROM decontrol(tct.country_control, p_country, p_locale)),
                (SELECT value FROM decontrol(tct.gender_control, p_gender, p_locale)),
                (SELECT value FROM decontrol(tct.age_control, p_age, p_locale)),
                tct.topic_category_visible,
                (SELECT translation FROM translate(tct.approval_status, p_locale))
            )) = true

            AND (p_group_id IS NULL OR p_group_id = tct.category_group_id)

            AND (p_type <> 'reviewer' OR (p_type = 'reviewer' 
                AND p_reviewer_tab IS NOT NULL 
                AND get_approval_checker(
                    p_user_id,
                    p_reviewer_tab,
                    (SELECT translation FROM translate(tct.approval_status, p_locale)),
                    (SELECT translation::uuid FROM translate(tct.topic_category_reviewed_by, p_locale))
                ) = true))

            AND (p_type <> 'creator' OR (p_type = 'creator' 
                AND (SELECT translation::uuid FROM translate(tct.topic_category_created_by, p_locale)) <> p_user_id))

            AND (p_type <> 'private' OR (p_type = 'private' 
                AND (SELECT translation::uuid FROM translate(tct.topic_category_created_by, p_locale)) = p_user_id
                AND (sortID IS NULL OR tct.sort_created_id::text < sortID::text)
                AND tst.topic_is_favourite::boolean <> true
                AND (tct.topic_category_updated_at::timestamptz <= NOW() - INTERVAL '7 days'
                    OR tct.topic_category_updated_at::timestamptz IS NULL)
            ))

            AND (p_type <> 'favourite' OR (p_type = 'favourite' 
                AND (SELECT translation::uuid FROM translate(tct.topic_category_created_by, p_locale)) = p_user_id
                AND tst.topic_is_favourite::boolean = true
                AND (sortID IS NULL OR tst.sort_updated_id::text < sortID::text)
            ))

            AND (p_type <> 'recent' OR (p_type = 'recent' 
                AND (SELECT translation::uuid FROM translate(tct.topic_category_created_by, p_locale)) = p_user_id
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
            'topic_category_identity', (SELECT translation FROM translate(fc.topic_category_identity, p_locale)),
            'sort_created_id', fc.tct_sort_created_id,
            'sort_updated_id', fc.tct_sort_updated_id,
            'reviewer_id', fc.users_reviewer_id,
            'approval', (SELECT translation FROM translate(fc.approval_status, p_locale)),
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
            'age_control', (SELECT jsonb_agg(control) FROM build_control(fc.age_control, p_locale) AS control),
            'country_control', (SELECT jsonb_agg(control) FROM build_control(fc.country_control, p_locale) AS control),
            'language_control', (SELECT jsonb_agg(control) FROM build_control(fc.language_control, p_locale) AS control),
            'gender_control', (SELECT jsonb_agg(control) FROM build_control(fc.gender_control, p_locale) AS control),
            'category_group_details', jsonb_build_object(
                'category_group_id', fc.category_group_id,
                'category_group_identity', (SELECT translation FROM translate(fc.category_group_identity, p_locale))
            )
        )
    FROM filtered_categories fc;
END;
$function$

