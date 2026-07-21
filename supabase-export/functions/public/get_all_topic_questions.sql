-- schema:   public
-- function: get_all_topic_questions(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_topic_id uuid, p_after_question text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_all_topic_questions(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_topic_id uuid DEFAULT NULL::uuid, p_after_question text DEFAULT NULL::text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    EXECUTE format('
        SELECT
            jsonb_build_object(
                ''questions_id'', qt.questions_id,
                ''questions_created_at'', qt.questions_created_at,
                ''questions_updated_at'', qt.questions_updated_at,
                ''questions_text'', (SELECT * FROM reformat_text(qt.questions_text)),
                ''approval'', qat.approval_status_code,
                ''reviewer_id'',qt.users_reviewer_id,
                ''translated'', jsonb_build_object(
                    ''translation_default_locale'', qtrt.translation_default_locale,
                    ''translation'', (SELECT * FROM reformat_text(qtrt.%I))),
                ''option_simple_data'', (SELECT COUNT(*)
                FROM get_all_question_options(%L,qt.questions_id,
                %L)),
                ''time_data'',jsonb_build_object(
                  ''question_time_id'', qtit.question_time_id,
                  ''question_time_value'',qtit.question_time_value
                ),
                ''type_data'',jsonb_build_object(
                  ''question_type_id'', qtt.question_type_id,
                  ''question_type_identity'',qtt.question_type_identity,
                  ''translated'', jsonb_build_object(
                    ''translation_default_locale'', qttrt.translation_default_locale,
                    ''translation'', qttrt.%I)
                ),
                ''creator_details'', jsonb_build_object(
                    ''users_id'', cud.users_id,
                    ''users_names'', cud.users_names,
                    ''users_username'', cud.users_username),
                ''creator_followers'', (SELECT COUNT(users_followers_id) FROM users_followers_table WHERE users_creator_id = cud.users_id),
                ''age_control'',(SELECT match_table_details(
                            ''age_control_table'',
                            ''control_details_table'',%L,
                            ''control_details_id'',
                            ''age_control_id'',
                            qt.age_control_id,
                            ARRAY[''age_control_id'',''age_control_created_at'',''age_control_identity'']
                )),
                ''country_control'',(SELECT match_table_details(
                            ''country_control_table'',
                            ''control_details_table'',%L,
                            ''control_details_id'',
                            ''country_control_id'',
                            qt.country_control_id,
                            ARRAY[''country_control_id'',''country_control_created_at'',''country_control_identity'']
                )),
                ''language_control'',(SELECT match_table_details(
                            ''language_control_table'',
                            ''control_details_table'',%L,
                            ''control_details_id'',
                            ''language_control_id'',
                            qt.language_control_id,
                            ARRAY[''language_control_id'',''language_control_created_at'',''language_control_identity'']
                )),
                ''gender_control'',(SELECT match_table_details(
                            ''gender_control_table'',
                            ''control_details_table'',%L,
                            ''control_details_id'',
                            ''gender_control_id'',
                            qt.gender_control_id,
                            ARRAY[''gender_control_id'',''gender_control_created_at'',''gender_control_identity'']
                ))
            )
        FROM questions_table qt
        LEFT JOIN approval_table qat ON qt.approval_id = qat.approval_id
        LEFT JOIN country_control_table tcct ON qt.country_control_id = tcct.country_control_id
        LEFT JOIN language_control_table lcct ON qt.language_control_id = lcct.language_control_id
        LEFT JOIN age_control_table acct ON qt.age_control_id = acct.age_control_id
        LEFT JOIN gender_control_table gcct ON qt.gender_control_id = gcct.gender_control_id
        LEFT JOIN translation_table qtrt ON qt.translation_id = qtrt.translation_id
        LEFT JOIN question_type_table qtt ON qt.question_type_id = qtt.question_type_id
        LEFT JOIN question_time_table qtit ON qt.question_time_id = qtit.question_time_id
        LEFT JOIN translation_table qttrt ON qtt.translation_id = qttrt.translation_id
        LEFT JOIN users_table cud ON qt.users_creator_id = cud.users_id
        WHERE (((SELECT * FROM override_access_checker(qt.users_creator_id,%L,%L)) = true) OR  (qt.users_creator_id = %L OR (
        qt.questions_visible = true
        AND tcct.%I = true
        AND lcct.%I = true
        AND acct.%I = true
        AND gcct.%I = true
        AND qat.approval_status_code = 200 
        AND (SELECT * FROM permission_checker(qt.users_creator_id,%L)) = true 
        )))
        AND qt.questions_created_at > %L
        AND qt.topics_id = %L OR %L IS NULL
        GROUP BY
            qt.questions_id, qt.questions_created_at,qt.questions_updated_at,qt.questions_text,
            qt.age_control_id,qt.language_control_id,qt.country_control_id,qt.gender_control_id,qat.approval_status_code,
            qtrt.translation_default_locale, qtrt.%I,
            qtit.question_time_id,qtit.question_time_value,
            qtt.question_type_id,qtt.question_type_identity, qttrt.translation_default_locale, qttrt.%I,
            cud.users_id, cud.users_names, cud.users_username
        ORDER BY qt.questions_created_at ASC
        LIMIT %L;',
        p_locale,
        p_user_id,
        p_locale,
        p_locale,
        p_locale,p_locale,p_locale,p_locale,
        p_user_id,
        'question',
        p_user_id,
        p_country, p_locale, p_age, p_gender,
        p_user_id,
        p_after_question, 
        p_topic_id,
        p_topic_id,
        p_locale,
        p_locale,
        p_limit_by
    );

END;$function$

