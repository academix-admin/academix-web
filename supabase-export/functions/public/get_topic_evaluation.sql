-- schema:   public
-- function: get_topic_evaluation(p_user_id uuid, p_topic_id uuid, p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_topic_evaluation(p_user_id uuid, p_topic_id uuid, p_locale text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result jsonb;
    viewer_role_level INT;
BEGIN

    SELECT jsonb_build_object(
        'topics_id', tt.topics_id,
        'topics_image',tt.topics_image,
        'topic_category_id',tt.topic_category_id,
        -- 'approval_table', json_build_object(
        --     'approval_id', tat.approval_id,
        --     'approval_status_code', tat.approval_status_code
        -- ),
        'approval_status', (SELECT translation FROM translate(tt.approval_status, p_locale)),
        'age_control', (SELECT jsonb_agg(control) FROM build_control(tt.age_control, p_locale) AS control),
        'country_control', (SELECT jsonb_agg(control) FROM build_control(tt.country_control, p_locale) AS control),
        'language_control', (SELECT jsonb_agg(control) FROM build_control(tt.language_control, p_locale) AS control),
        'gender_control', (SELECT jsonb_agg(control) FROM build_control(tt.gender_control, p_locale) AS control),
        -- 'decision_translation',tt.topics_identity,
        'topics_identity', (SELECT translation FROM translate(tt.topics_identity, p_locale)) ,
        'users_table', get_user_fields((SELECT translation::uuid from translate(tt.topics_created_by, p_locale)) , ARRAY['users_id', 'users_names', 'users_username'])
    )
    INTO result
    FROM topics_table tt
    WHERE 
        (
            (SELECT permission_checker((SELECT translation::uuid FROM translate(tt.topics_created_by,p_locale)), p_user_id)) = TRUE 
            AND tt.topics_id = p_topic_id
        );

    RETURN result;
END;
$function$

