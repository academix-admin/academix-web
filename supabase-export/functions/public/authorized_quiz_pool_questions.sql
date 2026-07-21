-- schema:   public
-- function: authorized_quiz_pool_questions(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.authorized_quiz_pool_questions(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_pool_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "pools_question": [], "pools_quiz": null, "error": null, "called": "500"}';
    questions JSONB[];
    pool RECORD;
BEGIN
    -- Get pool record
    SELECT * INTO pool 
    FROM pools_table pt 
    WHERE pt.pools_id = p_pool_id;

    -- Check if pool exists
    IF NOT FOUND THEN
        result := jsonb_set(result, '{status}', '"Pool.not_found"');
        RETURN result;
    END IF;

    -- Check pool status and job 
    IF pool.pools_status = 'Pools.active'
   AND (
       pool.pools_job = 'PoolJob.pool_period'
       OR (
           pool.pools_job = 'PoolJob.start_pool'
           AND (NOW())::TEXT >= (pool.pools_job_end_at)::TEXT 
       )
   )
   AND pool.pools_allow_submission = TRUE THEN

        SELECT ARRAY_AGG(jsonb_build_object(
            'pools_question_id', pqt.pools_question_id,
            'question_data', jsonb_build_object(
                'questions_id', qt.questions_id,
                'questions_image', qt.questions_image,
                'questions_text', (SELECT translation FROM translate(qt.questions_identity, p_locale))
            ),
            'options_data', (
                SELECT jsonb_agg(option_data)
                FROM get_pool_question_options(p_country, p_locale, p_gender, p_age, p_user_id, qt.questions_id, qtt.question_type_local_identity) AS option_data
            ),
            'question_time_data', jsonb_build_object(
                'question_time_id', qtit.question_time_id,
                'question_time_value', qtit.question_time_value
            ),
            'question_type_data', jsonb_build_object(
                'question_type_id', qtt.question_type_id,
                'question_type_identity', (SELECT translation FROM translate(qtt.question_type_identity, p_locale)),
                'question_type_local_identity', qtt.question_type_local_identity
            ),
            -- Time taken by this user for this question (null if not yet submitted)
            'question_time', (
                SELECT tracker.question_tracker_time_taken
                FROM question_tracker_table tracker
                JOIN pools_question_table pq ON pq.pools_question_id = tracker.pools_question_id
                WHERE pq.questions_id = qt.questions_id
                  AND pq.pools_id = p_pool_id
                  AND tracker.users_id = p_user_id
            ),
            -- Graded status for this question (null if not yet submitted)
            'question_status', (
                SELECT tracker.question_tracker_question_status
                FROM question_tracker_table tracker
                JOIN pools_question_table pq ON pq.pools_question_id = tracker.pools_question_id
                WHERE pq.questions_id = qt.questions_id
                  AND pq.pools_id = p_pool_id
                  AND tracker.users_id = p_user_id
            ),
            -- Options this user selected, resolved to locale display labels (null if not yet submitted)
            'options_selected', (
                SELECT array_agg(
                    (SELECT translation FROM translate(ot.options_identity, p_locale))
                    ORDER BY ot.options_id
                )
                FROM question_tracker_table tracker
                JOIN pools_question_table pq   ON pq.pools_question_id   = tracker.pools_question_id
                JOIN option_tracker_table ott  ON ott.question_tracker_id = tracker.question_tracker_id
                JOIN options_table ot          ON ot.options_id           = ott.options_id
                WHERE pq.questions_id  = qt.questions_id
                  AND pq.pools_id      = p_pool_id
                  AND tracker.users_id = p_user_id
            )
        )) INTO questions 
        FROM pools_question_table pqt 
        LEFT JOIN questions_table qt      ON pqt.questions_id     = qt.questions_id
        LEFT JOIN question_type_table qtt ON qt.question_type_id  = qtt.question_type_id
        LEFT JOIN question_time_table qtit ON qt.question_time_id = qtit.question_time_id
        WHERE pqt.pools_id = p_pool_id;
       
        -- Check if questions were found
        IF questions IS NOT NULL AND array_length(questions, 1) > 0 THEN 
            result := jsonb_set(result, '{status}', '"Pool.allowed"');
            result := jsonb_set(result, '{pools_quiz}', to_jsonb(pool));
            result := jsonb_set(result, '{pools_question}', to_jsonb(questions));
        ELSE 
            result := jsonb_set(result, '{status}', '"Pool.empty"');
        END IF;
    ELSE
        result := jsonb_set(result, '{status}', '"Pool.not_allowed"');
    END IF;

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{status}', '"Pool.error"');
        result := jsonb_set(result, '{error}', to_jsonb('Error: ' || SQLERRM));
        RETURN result;
END;
$function$

