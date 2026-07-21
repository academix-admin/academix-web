-- schema:   public
-- function: get_group_evaluation(p_user_id uuid, p_group_id uuid, p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_group_evaluation(p_user_id uuid, p_group_id uuid, p_locale text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result jsonb;
    viewer_role_level INT;
BEGIN

    SELECT jsonb_build_object(
        'category_group_id', cgt.category_group_id,
        'category_group_image', null,
        -- 'approval_table', json_build_object(
        --     'approval_id', cgat.approval_id,
        --     'approval_status_code', cgat.approval_status_code
        -- ),
        'approval_status', (SELECT translation FROM translate(cgt.approval_status, p_locale)),
        'age_control', (SELECT jsonb_agg(control) FROM build_control(cgt.age_control, p_locale) AS control),
        'country_control', (SELECT jsonb_agg(control) FROM build_control(cgt.country_control, p_locale) AS control),
        'language_control', (SELECT jsonb_agg(control) FROM build_control(cgt.language_control, p_locale) AS control),
        'gender_control', (SELECT jsonb_agg(control) FROM build_control(cgt.gender_control, p_locale) AS control),
        -- 'decision_translation', cgt.category_group_identity,
        'category_group_identity', (SELECT translation FROM translate(cgt.category_group_identity, p_locale)) ,
        'users_table', get_user_fields((SELECT translation::uuid from translate(cgt.category_group_created_by,p_locale)) , ARRAY['users_id', 'users_names', 'users_username'])
    )
    INTO result
    FROM category_group_table cgt
    WHERE (
            (SELECT permission_checker((SELECT translation::uuid FROM translate(cgt.category_group_created_by,p_locale)), p_user_id)) = TRUE 
            AND cgt.category_group_id = p_group_id
        );

    RETURN result;
END;
$function$

