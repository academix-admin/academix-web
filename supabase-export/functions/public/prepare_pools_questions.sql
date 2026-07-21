-- schema:   public
-- function: prepare_pools_questions(p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.prepare_pools_questions(p_pool_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    question_count     INT;
    total_users        INT;
    selected_questions UUID[];
    fallback_questions UUID[];
    fair_question_ids  UUID[];  -- tracks which questions_ids were selected as fair
                                -- so fallback can exclude them without a CTE reference
BEGIN
    -- ── Lock the pool row first ───────────────────────────────────────────────
    -- Prevents two concurrent update_pool_status invocations from running
    -- prepare_pools_questions simultaneously and producing conflicting deletes.
    PERFORM 1 FROM pools_table WHERE pools_id = p_pool_id FOR UPDATE;

    -- ── Step 1: Get required question count ───────────────────────────────────
    SELECT COALESCE(ct.challenge_question_count, 0)
    INTO question_count
    FROM pools_table pt
    LEFT JOIN challenge_table ct ON ct.challenge_id = pt.challenge_id
    WHERE pt.pools_id = p_pool_id;

    IF question_count <= 0 THEN
        RAISE WARNING 'prepare_pools_questions: question_count is 0 for pool %', p_pool_id;
        RETURN FALSE;
    END IF;

    -- ── Step 2: Get total distinct users who contributed questions ────────────
    SELECT COUNT(DISTINCT users_id)
    INTO total_users
    FROM pools_question_table
    WHERE pools_id = p_pool_id;

    IF total_users = 0 THEN
        RAISE WARNING 'prepare_pools_questions: no user contributions found for pool %', p_pool_id;
        RETURN FALSE;
    END IF;

    -- ── Step 3: Select fair questions (seen by >= 40% of users) ──────────────
    -- DISTINCT ON (questions_id) picks one pools_question_id per unique
    -- question. ORDER BY questions_id, RANDOM() is intentional — it
    -- randomises which specific row is kept when multiple users submitted
    -- the same question, giving variety in whose version is used.
    WITH user_contributions AS (
        SELECT
            questions_id,
            COUNT(DISTINCT users_id) AS contrib_count
        FROM pools_question_table
        WHERE pools_id = p_pool_id
        GROUP BY questions_id
    ),
    fair_candidates AS (
        SELECT DISTINCT ON (pqt.questions_id)
            pqt.questions_id,
            pqt.pools_question_id
        FROM pools_question_table pqt
        JOIN user_contributions uc ON uc.questions_id = pqt.questions_id
        WHERE pqt.pools_id = p_pool_id
          AND uc.contrib_count >= GREATEST(1, total_users * 0.4)
        ORDER BY pqt.questions_id, RANDOM()
    )
    SELECT
        ARRAY_AGG(pools_question_id ORDER BY RANDOM()),  -- final shuffle
        ARRAY_AGG(questions_id)                           -- track which q_ids used
    INTO selected_questions, fair_question_ids
    FROM (
        SELECT pools_question_id, questions_id
        FROM fair_candidates
        LIMIT question_count
    ) sub;

    -- ── Step 4: Fallback — fill remaining slots with any other questions ──────
    -- Only runs if fair questions were insufficient.
    -- Uses fair_question_ids (a plain variable) to exclude already-selected
    -- questions — avoids the CTE-out-of-scope bug where referencing
    -- fair_questions in a separate SQL statement throws "relation does not exist".
    IF COALESCE(array_length(selected_questions, 1), 0) < question_count THEN

        WITH fallback_candidates AS (
            SELECT DISTINCT ON (pqt.questions_id)
                pqt.questions_id,
                pqt.pools_question_id
            FROM pools_question_table pqt
            WHERE pqt.pools_id = p_pool_id
              -- Exclude questions already selected as fair.
              -- = ANY() is safe with NULLs; NOT IN() is not.
              AND NOT (pqt.questions_id = ANY(COALESCE(fair_question_ids, '{}')))
            ORDER BY pqt.questions_id, RANDOM()
        )
        SELECT ARRAY_AGG(pools_question_id ORDER BY RANDOM())
        INTO fallback_questions
        FROM (
            SELECT pools_question_id
            FROM fallback_candidates
            LIMIT question_count - COALESCE(array_length(selected_questions, 1), 0)
        ) sub;

        -- Merge fair + fallback and trim to exact size
        selected_questions := (
            SELECT ARRAY(
                SELECT q
                FROM UNNEST(
                    COALESCE(selected_questions, '{}') ||
                    COALESCE(fallback_questions,  '{}')
                ) AS q
                WHERE q IS NOT NULL   -- guard against NULL elements in concat
                LIMIT question_count
            )
        );

    END IF;

    -- ── Step 5: Final check and cleanup ──────────────────────────────────────
    IF COALESCE(array_length(selected_questions, 1), 0) < question_count THEN
        RAISE WARNING 'prepare_pools_questions: only found % of % questions for pool %',
            COALESCE(array_length(selected_questions, 1), 0), question_count, p_pool_id;
        RETURN FALSE;
    END IF;

    -- Delete all rows not in the selected set.
    -- Uses = ANY() instead of NOT IN() — safe when selected_questions
    -- contains NULLs (ANY handles them correctly, NOT IN does not).
    DELETE FROM pools_question_table
    WHERE pools_id          = p_pool_id
      AND NOT (pools_question_id = ANY(selected_questions));

    RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'prepare_pools_questions error for pool %: %', p_pool_id, SQLERRM;
    RETURN FALSE;
END;
$function$

