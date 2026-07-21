-- schema:   public
-- function: get_question_evaluation(p_user_id uuid, p_question_id uuid, p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_question_evaluation(p_user_id uuid, p_question_id uuid, p_locale text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result jsonb;
    viewer_role_level INT;
BEGIN


    SELECT jsonb_build_object(
        'questions_id',qt.questions_id,
        'questions_image',qt.questions_image,
        'topics_id',qt.topics_id,
        -- 'approval_table', jsonb_build_object(
        --     'approval_id', tat.approval_id,
        --     'approval_status_code', tat.approval_status_code
        -- ),
        'approval_status', (SELECT translation FROM translate(qt.approval_status, p_locale)),
        'question_time_table', jsonb_build_object(
           'question_time_id',qtit.question_time_id,
          'question_time_value',qtit.question_time_value
        ),
        'question_type_table', jsonb_build_object(
            'question_type_identity', (SELECT translation FROM translate(qtt.question_type_identity,p_locale)),
            'question_type_id',qtt.question_type_id
        ),
        'options_table', (SELECT jsonb_agg(option) FROM get_option_evaluation(p_user_id, qt.questions_id, p_locale) AS option),
        'age_control', (SELECT jsonb_agg(control) FROM build_control(qt.age_control, p_locale) AS control),
        'country_control', (SELECT jsonb_agg(control) FROM build_control(qt.country_control, p_locale) AS control),
        'language_control', (SELECT jsonb_agg(control) FROM build_control(qt.language_control, p_locale) AS control),
        'gender_control', (SELECT jsonb_agg(control) FROM build_control(qt.gender_control, p_locale) AS control),
        'decision_translation',qt.questions_identity,
        'questions_identity', (SELECT translation FROM translate(qt.questions_identity, p_locale)) ,
        'users_table', get_user_fields((SELECT translation::uuid from translate(qt.questions_created_by, p_locale)) , ARRAY['users_id', 'users_names', 'users_username'])
    )
    INTO result
    FROM questions_table qt
    LEFT JOIN question_time_table qtit ON qt.question_time_id = qtit.question_time_id
    LEFT JOIN question_type_table qtt ON qt.question_type_id = qtt.question_type_id
    WHERE 
        (
            (SELECT permission_checker((SELECT translation::uuid FROM translate(qt.questions_created_by,p_locale)), p_user_id)) = TRUE 
            AND qt.questions_id = p_question_id
        );

    RETURN result;
END;
$function$

