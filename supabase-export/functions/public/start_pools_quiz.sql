-- schema:   public
-- function: start_pools_quiz(p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.start_pools_quiz(p_pool_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    question_prepared  BOOLEAN;
    questions_duration INT := 0;
    users_charged      BOOLEAN;
BEGIN
    -- Step 1: Select fair questions from what users contributed at join time.
    SELECT COALESCE(prepare_pools_questions(p_pool_id), FALSE) INTO question_prepared;

    IF NOT question_prepared THEN
        RAISE WARNING 'start_pools_quiz: prepare_pools_questions failed for pool %', p_pool_id;
        RETURN 0;
    END IF;

    -- Step 2: Calculate total quiz duration from the prepared question set
    SELECT COALESCE(SUM(qtt.question_time_value), 0) INTO questions_duration
    FROM pools_question_table pqt
    LEFT JOIN questions_table qt       ON qt.questions_id  = pqt.questions_id
    LEFT JOIN question_time_table qtt  ON qtt.question_time_id = qt.question_time_id
    WHERE pqt.pools_id = p_pool_id;

    IF questions_duration <= 0 THEN
        RAISE WARNING 'start_pools_quiz: questions_duration is 0 for pool %', p_pool_id;
        RETURN 0;
    END IF;

    -- Step 3: Charge all members.
    -- Use PL/pgSQL inner block to create a subtransaction via EXCEPTION handling.
    BEGIN
        SELECT COALESCE(complete_pool_users_charge(p_pool_id), FALSE) INTO users_charged;

        IF NOT users_charged THEN
            RAISE WARNING 'start_pools_quiz: complete_pool_users_charge failed for pool %', p_pool_id;
            RETURN 0;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'start_pools_quiz: charge exception for pool %: %', p_pool_id, SQLERRM;
        RETURN 0;
    END;

    -- Step 4: Activate pool
    UPDATE pools_table
    SET
        pools_allow_submission = TRUE,
        pools_status           = 'Pools.active',
        pools_duration         = questions_duration,
        pools_starting_at      = NOW()
    WHERE pools_id = p_pool_id;

    RETURN questions_duration;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'start_pools_quiz: unhandled exception for pool %: %', p_pool_id, SQLERRM;
    RETURN 0;
END;
$function$

