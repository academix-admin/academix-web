-- schema:   public
-- function: fetch_questions(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_after_questions jsonb, p_type text, p_topic_id uuid, p_reviewer_tab text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_questions(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_after_questions jsonb, p_type text, p_topic_id uuid DEFAULT NULL::uuid, p_reviewer_tab text DEFAULT NULL::text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sortID TEXT;
BEGIN
    sortID := (p_after_questions->>'sort_id')::TEXT;
    
    RETURN QUERY
    WITH filtered_questions AS (
        SELECT
            qt.questions_id,
            qt.questions_image,
            qt.questions_created_at,
            qt.questions_updated_at,
            qt.sort_created_id,
            qt.sort_updated_id,
            qt.questions_identity,
            qt.topics_id,
            qt.question_time_id,
            qt.question_type_id,
            qt.age_control,
            qt.country_control,
            qt.language_control,
            qt.gender_control,
            qt.approval_status,
            (SELECT translation::uuid FROM translate(qt.questions_created_by, p_locale)) AS users_creator_id,
            (SELECT translation::uuid FROM translate(qt.questions_reviewed_by, p_locale)) AS users_reviewer_id
        FROM questions_table qt
        WHERE 
            (SELECT * FROM fetch_general_content_check(
                (SELECT translation::uuid FROM translate(qt.questions_created_by, p_locale)),
                p_user_id,
                (SELECT translation FROM translate(qt.questions_identity, p_locale)),
                (SELECT translation::uuid FROM translate(qt.questions_reviewed_by, p_locale)), -- ✅ Fixed: was qt.users_reviewer_id
                (SELECT value FROM decontrol(qt.language_control, p_locale)),
                (SELECT value FROM decontrol(qt.country_control, p_country)),
                (SELECT value FROM decontrol(qt.gender_control, p_gender)),
                (SELECT value FROM decontrol(qt.age_control, p_age)),
                qt.questions_visible,
                (SELECT translation FROM translate(qt.approval_status, p_locale))
            )) = true

            AND (p_topic_id = qt.topics_id::uuid OR p_type = 'reviewer')

            AND (p_type <> 'reviewer' OR (p_type = 'reviewer' 
                AND p_reviewer_tab IS NOT NULL 
                AND get_approval_checker(
                    p_user_id,
                    p_reviewer_tab,
                    (SELECT translation FROM translate(qt.approval_status, p_locale)),
                    (SELECT translation::uuid FROM translate(qt.questions_reviewed_by, p_locale))
                ) = true))

            AND (p_type <> 'creator' OR (p_type = 'creator' 
                AND (SELECT translation::uuid FROM translate(qt.questions_created_by, p_locale)) <> p_user_id))

            AND (p_type <> 'private' OR (p_type = 'private' 
                AND (SELECT translation::uuid FROM translate(qt.questions_created_by, p_locale)) = p_user_id
                AND (sortID IS NULL OR qt.sort_created_id::text < sortID::text)
            ))

            AND (p_type NOT IN ('creator', 'reviewer') OR (p_type IN ('creator', 'reviewer') 
                AND (sortID IS NULL OR qt.sort_updated_id::text < sortID::text)
            ))

        ORDER BY 
            CASE WHEN p_type IN ('reviewer', 'creator') THEN qt.sort_updated_id::text ELSE NULL END DESC,
            CASE WHEN p_type = 'private' THEN qt.sort_created_id::text ELSE NULL END DESC
        LIMIT p_limit_by
    )
    SELECT
        jsonb_build_object(
            'questions_id', fq.questions_id,
            'questions_image', fq.questions_image,
            'questions_created_at', fq.questions_created_at,
            'questions_updated_at', fq.questions_updated_at,
            'sort_created_id', fq.sort_created_id,
            'sort_updated_id', fq.sort_updated_id,
            'questions_text', (SELECT * FROM reformat_text((SELECT translation FROM translate(fq.questions_identity, p_locale)))),
            'approval', (SELECT translation FROM translate(fq.approval_status, p_locale)),
            'reviewer_id', fq.users_reviewer_id,
            'topics_id', fq.topics_id,
            'option_simple_data', (SELECT COUNT(options) FROM get_all_question_options(p_user_id, fq.questions_id, p_locale) AS options),
            'time_data', jsonb_build_object(
                'question_time_id', qtit.question_time_id,
                'question_time_value', qtit.question_time_value
            ),
            'type_data', jsonb_build_object(
                'question_type_id', qtt.question_type_id,
                'question_type_identity', (SELECT translation FROM translate(qtt.question_type_identity, p_locale))
            ),
            'creator_details', get_user_fields(
                fq.users_creator_id, -- ✅ Fixed: was fq.users_id
                ARRAY['users_id', 'users_names', 'users_username', 'users_image']
            ),
            'age_control', (SELECT jsonb_agg(control) FROM build_control(fq.age_control, p_locale) AS control),
            'country_control', (SELECT jsonb_agg(control) FROM build_control(fq.country_control, p_locale) AS control),
            'language_control', (SELECT jsonb_agg(control) FROM build_control(fq.language_control, p_locale) AS control),
            'gender_control', (SELECT jsonb_agg(control) FROM build_control(fq.gender_control, p_locale) AS control)
        )
    FROM filtered_questions fq
    LEFT JOIN question_type_table qtt ON fq.question_type_id = qtt.question_type_id
    LEFT JOIN question_time_table qtit ON fq.question_time_id = qtit.question_time_id;
END;
$function$

