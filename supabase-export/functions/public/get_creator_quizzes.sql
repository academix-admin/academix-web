-- schema:   public
-- function: get_creator_quizzes(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_creator_quizzes(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sql_query text;
BEGIN
    -- Construct the dynamic SQL query
    sql_query := format($$
        SELECT
            jsonb_build_object(
                'topics_id', tt.topics_id,
                'topics_created_at', tt.topics_created_at,
                'topics_updated_at', tt.topics_updated_at,
                'sort_created_id', tt.sort_created_id,
                'sort_updated_id', tt.sort_updated_id,
                'topics_identity', tt.topics_identity,
                'translated', jsonb_build_object(
                    'translation_default_locale', ttrt.translation_default_locale,
                    'translation', ttrt.%I),
                'pools_details', json_build_object(
                    'pools_id', pt.pools_id,
                    'pools_status', pt.pools_status,
                    'sort_created_id', pt.sort_created_id,
                    'sort_updated_id', pt.sort_updated_id,
                    'pools_duration', pt.pools_duration,
                    'pools_starting_at', pt.pools_starting_at,
                    'pools_job',pt.pools_job,
                    'pools_job_end_at',pt.pools_job_end_at,
                    'challenge_details', jsonb_build_object(
                        'challenge_id', ct.challenge_id, 
                        'challenge_identity', ct.challenge_identity,
                        'challenge_development_charge',ct.challenge_development_charge,
                        'challenge_price',ct.challenge_price,
                        'challenge_top_share',ct.challenge_top_share,
                        'challenge_mid_share',ct.challenge_mid_share,
                        'challenge_bot_share',ct.challenge_bot_share,
                        'challenge_min_participants', ct.challenge_min_participants,
                        'challenge_max_participants', ct.challenge_max_participants,
                        'challenge_question_count', ct.challenge_question_count,
                        'translated', jsonb_build_object(
                            'translation_default_locale', ctrt.translation_default_locale,
                            'translation', ctrt.%I
                        )
                    ),
                    'pools_members_count', (
                        SELECT count(pm.users_id) 
                        FROM pools_members_table pm 
                        WHERE pm.pools_id = pt.pools_id AND pm.topics_id = tt.topics_id
                    ),
                    'question_tracker_count', (
                        SELECT count(qt.question_tracker_id) 
                        FROM question_tracker_table qt 
                        WHERE qt.pools_id = pt.pools_id AND qt.users_id = %L
                    )
                ),
                'creator_details', jsonb_build_object(
                    'users_id', cud.users_id,
                    'users_names', cud.users_names,
                    'users_username', cud.users_username
                ),
                'creator_followers', (
                    SELECT COUNT(users_followers_id) 
                    FROM users_followers_table 
                    WHERE users_creator_id = cud.users_id
                )
            )
        FROM pools_table pt
        LEFT JOIN topics_table tt ON tt.topics_id = pt.topics_id
        LEFT JOIN challenge_table ct ON pt.challenge_id = ct.challenge_id
        LEFT JOIN translation_table ctrt ON ctrt.translation_id = ct.translation_id
        LEFT JOIN translation_table ttrt ON tt.translation_id = ttrt.translation_id
        LEFT JOIN approval_table tat ON tt.approval_id = tat.approval_id
        LEFT JOIN country_control_table tcct ON tt.country_control_id = tcct.country_control_id
        LEFT JOIN language_control_table lcct ON tt.language_control_id = lcct.language_control_id
        LEFT JOIN age_control_table acct ON tt.age_control_id = acct.age_control_id
        LEFT JOIN gender_control_table gcct ON tt.gender_control_id = gcct.gender_control_id
        LEFT JOIN users_table cud ON tt.users_creator_id = cud.users_id
        WHERE 
            (SELECT * FROM get_quiz_content_check(
                tt.users_creator_id, %L::uuid, 'topic',
                lcct.%I = true, tcct.%I = true,
                gcct.%I = true, acct.%I = true,
                tt.topics_visible, tat.approval_status_code::int
            )) = true
            AND (SELECT * 
            FROM public.get_challenge_accepted(
                %L::uuid, 
                tt.topics_id, 
                ct.challenge_id, 
                %L, 
                %L, 
                %L, 
                %L
            )) = true
            AND (%L = ANY((
                SELECT users_id 
                FROM users_followers_table 
                WHERE users_creator_id = cud.users_id
            )))
            AND (%L NOT IN (
                SELECT users_id from
                pools_members_table pm WHERE pm.pools_id = pt.pools_id AND pm.topics_id = tt.topics_id
            )) 
            AND 
              (
                        SELECT count(pm.users_id) 
                        FROM pools_members_table pm 
                        WHERE pm.pools_id = pt.pools_id AND pm.topics_id = tt.topics_id
                    ) < ct.challenge_max_participants     
            AND pt.pools_status <> 'Pools.active' 
            AND pt.pools_visible = TRUE
            AND (pt.pools_job IS NULL OR (pt.pools_job IS NOT NULL AND pt.pools_job <> 'PoolJob.cancelled')) 
            AND (pt.pools_starting_at IS NULL OR (pt.pools_starting_at IS NOT NULL AND (pt.pools_starting_at)::TIMESTAMPTZ > NOW()))
        GROUP BY
            tt.topics_id, tt.topics_updated_at, tt.topics_identity,
            pt.pools_id, pt.pools_status, pt.pools_starting_at, pt.pools_duration,
            ct.challenge_id, ct.challenge_identity, ct.challenge_question_count,
            ctrt.translation_default_locale, ctrt.%I,
            ttrt.translation_default_locale, ttrt.%I, cud.users_id, cud.users_names, cud.users_username
    $$,
    p_locale, p_locale, p_user_id, p_user_id, p_locale, p_country, p_gender, p_age, 
    p_user_id,  p_country, p_locale, p_gender, p_age, p_user_id,p_user_id, p_locale, p_locale
    );

    -- Execute the query and return the result set
    RETURN QUERY EXECUTE sql_query;
END;
$function$

