-- schema:   public
-- function: get_category_evaluation(p_user_id uuid, p_category_id uuid, p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_category_evaluation(p_user_id uuid, p_category_id uuid, p_locale text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result jsonb;
    viewer_role_level INT;
BEGIN

    SELECT jsonb_build_object(
        'topic_category_id', tct.topic_category_id,
        'topic_category_image', tct.topic_category_image,
        'category_group_id', tct.category_group_id,
        -- 'approval_table', json_build_object(
        --     'approval_id', tat.approval_id,
        --     'approval_status_code', tat.approval_status_code
        -- ),
        'approval_status', (SELECT translation FROM translate(tct.approval_status, p_locale)),
        'age_control', (SELECT jsonb_agg(control) FROM build_control(tct.age_control, p_locale) AS control),
        'country_control', (SELECT jsonb_agg(control) FROM build_control(tct.country_control, p_locale) AS control),
        'language_control', (SELECT jsonb_agg(control) FROM build_control(tct.language_control, p_locale) AS control),
        'gender_control', (SELECT jsonb_agg(control) FROM build_control(tct.gender_control, p_locale) AS control),
        -- 'decision_translation',tct.topic_category_identity,
        'topic_category_identity', (SELECT translation FROM translate(tct.topic_category_identity, p_locale)) ,
        'users_table', get_user_fields((SELECT translation::uuid from translate(tct.topic_category_created_by, p_locale)) , ARRAY['users_id', 'users_names', 'users_username'])
    )
    INTO result
    FROM topic_category_table tct
    WHERE 
        (
            (SELECT permission_checker((SELECT translation::uuid FROM translate(tct.topic_category_created_by,p_locale)), p_user_id)) = TRUE 
            AND tct.topic_category_id = p_category_id
        );

    RETURN result;
END;
$function$

