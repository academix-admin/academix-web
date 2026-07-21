-- schema:   public
-- function: submit_question_tracker(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_submission jsonb)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.submit_question_tracker(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_submission jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result                  JSONB := '{"status": null, "question_status": null, "pools_details": null, "options_selected": null, "error": null}';
    active_pool             RECORD;
    pool_question_id        UUID;
    question_id             UUID;
    time_taken              NUMERIC;
    option_data             JSONB[];
    new_tracker_id          UUID;
    pool_details            RECORD;
    question_status         TEXT;
    submit_option_length    INT;
    original_options        UUID[];
    original_identity       JSONB[];
    original_option_length  INT;
    question_type           TEXT;
    submitted_slider_value  NUMERIC;
    correct_slider_value    NUMERIC;
    is_option_data_empty    BOOLEAN := TRUE;
    option_element          JSONB;
    match_count             INT;
    i                       INT;
    options_selected        TEXT[];   -- ← ADDED
BEGIN

    -- ── [1] Validate required parameters ─────────────────────────────────────
    IF p_user_id IS NULL OR p_submission IS NULL THEN
        result := jsonb_set(result, '{status}', '"Submission.error"');
        RETURN result;
    END IF;

    -- ── [2] Extract values from submission JSON ───────────────────────────────
    pool_question_id := (p_submission->>'pools_question_id')::UUID;
    time_taken       := (p_submission->>'time_taken')::NUMERIC;

    option_data := CASE
        WHEN p_submission->'option_data' IS NULL THEN ARRAY[]::JSONB[]
        WHEN jsonb_typeof(p_submission->'option_data') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements(p_submission->'option_data'))
        ELSE ARRAY[]::JSONB[]
    END;

    IF pool_question_id IS NULL OR time_taken IS NULL THEN
        result := jsonb_set(result, '{status}', '"Submission.error"');
        RETURN result;
    END IF;

    -- ── [3] Validate option_data is not empty ─────────────────────────────────
    -- At least one element must have a non-null options_id and options_identity
    IF option_data IS NOT NULL AND array_length(option_data, 1) > 0 THEN
        FOREACH option_element IN ARRAY option_data LOOP
            IF option_element->>'options_id'       IS NOT NULL AND
               option_element->>'options_id'       != ''       AND
               option_element->>'options_identity' IS NOT NULL
            THEN
                is_option_data_empty := FALSE;
                EXIT;
            END IF;
        END LOOP;
    END IF;

    IF is_option_data_empty THEN
        result := jsonb_set(result, '{status}', '"Submission.error"');
        RETURN result;
    END IF;

    -- ── [4] Verify pool exists and is accepting submissions ───────────────────
    SELECT pt.* INTO active_pool
    FROM pools_question_table pqt
    JOIN pools_table pt ON pqt.pools_id = pt.pools_id
    WHERE pqt.pools_question_id = pool_question_id;

    IF NOT FOUND
       OR active_pool.pools_allow_submission = FALSE
       OR active_pool.pools_job = 'PoolJob.pool_ended'
       OR (
           active_pool.pools_job = 'PoolJob.pool_closed'
           AND NOW()::TIMESTAMPTZ >= (active_pool.pools_job_end_at)::TIMESTAMPTZ
       )
    THEN
        result := jsonb_set(result, '{status}', '"Submission.no_active"');
        RETURN result;
    END IF;

    -- Resolve question_id from the pool question
    SELECT pqt.questions_id INTO question_id
    FROM pools_question_table pqt
    WHERE pqt.pools_question_id = pool_question_id;

    -- ── [5] Insert tracker row ────────────────────────────────────────────────
    -- ON CONFLICT DO NOTHING is the atomic duplicate guard.
    -- If the unique constraint (pools_question_id, users_id) fires,
    -- RETURNING yields nothing and new_tracker_id stays NULL → duplicate path.
    -- No pre-check SELECT needed — that pattern has a race condition window.
    INSERT INTO question_tracker_table (
        users_id,
        pools_question_id,
        question_tracker_time_taken
    ) VALUES (
        p_user_id,
        pool_question_id,
        time_taken
    )
    ON CONFLICT (pools_question_id, users_id) DO NOTHING
    RETURNING question_tracker_id INTO new_tracker_id;

    IF new_tracker_id IS NULL THEN
        result := jsonb_set(result, '{status}', '"Submission.duplicate"');
        RETURN result;
    END IF;

    -- ── [6] Insert submitted options ──────────────────────────────────────────
    submit_option_length := array_length(option_data, 1)::INT;

    FOR i IN 1..submit_option_length LOOP
        INSERT INTO option_tracker_table (
            question_tracker_id,
            options_id,
            option_tracker_identity
        ) VALUES (
            new_tracker_id,
            (option_data[i]->>'options_id')::UUID,
            (option_data[i]->>'options_identity')::TEXT
        );
    END LOOP;

    -- ── [6b] Resolve display labels for submitted options ─────────────────────
    -- Joins back through option_tracker_table using new_tracker_id so only
    -- this user's just-inserted selections are included. translate() resolves
    -- each options_identity JSONB to the locale-appropriate display string.
    SELECT array_agg(
        (SELECT translation FROM translate(ot.options_identity, p_locale))
        ORDER BY ot.options_id
    )
    INTO options_selected
    FROM option_tracker_table ott
    JOIN options_table ot ON ot.options_id = ott.options_id
    WHERE ott.question_tracker_id = new_tracker_id;

    -- ── [7] Load correct answers ──────────────────────────────────────────────
    -- ORDER BY options_id ensures a deterministic array for positional grading.
    SELECT
        array_agg(ot.options_id       ORDER BY ot.options_id),
        array_agg(ot.options_identity ORDER BY ot.options_id),
        qtt.question_type_local_identity
    INTO original_options, original_identity, question_type
    FROM options_table ot
    JOIN questions_table qt  ON qt.questions_id  = ot.questions_id
    JOIN question_type_table qtt ON qtt.question_type_id = qt.question_type_id
    WHERE ot.questions_id = question_id
      AND ot.options_is_correct = TRUE
    GROUP BY qtt.question_type_local_identity;

    original_option_length := array_length(original_options, 1)::INT;

    -- ── [8] Grade submission by question type ─────────────────────────────────
    CASE question_type

        -- Single correct answer
        WHEN 'QuestionType.one_choice' THEN
            IF submit_option_length = 1 AND
               (option_data[1]->>'options_id')::UUID = original_options[1]
            THEN
                question_status := 'Question.completed';
            ELSE
                question_status := 'Question.failed';
            END IF;

        -- Boolean correct answer
        WHEN 'QuestionType.true_false' THEN
            IF submit_option_length = 1 AND
               (option_data[1]->>'options_id')::UUID = original_options[1]
            THEN
                question_status := 'Question.completed';
            ELSE
                question_status := 'Question.failed';
            END IF;

        -- Numeric range answer — compare at 3dp to absorb float noise
        WHEN 'QuestionType.slider' THEN
            submitted_slider_value := ROUND((option_data[1]->>'options_identity')::NUMERIC, 3);
            correct_slider_value   := ROUND(
                (SELECT translation FROM translate(original_identity[1], p_locale))::NUMERIC, 3
            );

            IF submit_option_length = 1 AND
               (option_data[1]->>'options_id')::UUID = original_options[1] AND
               submitted_slider_value = correct_slider_value
            THEN
                question_status := 'Question.completed';
            ELSE
                question_status := 'Question.failed';
            END IF;

        -- Text fill — case-insensitive, trimmed comparison
        WHEN 'QuestionType.fill_gap' THEN
            IF submit_option_length = 1 AND
               (option_data[1]->>'options_id')::UUID = original_options[1] AND
               LOWER(TRIM(option_data[1]->>'options_identity')) =
               LOWER(TRIM((SELECT translation FROM translate(original_identity[1], p_locale))::TEXT))
            THEN
                question_status := 'Question.completed';
            ELSE
                question_status := 'Question.failed';
            END IF;

        -- Multiple correct answers — order-independent set comparison.
        -- Counts how many submitted option_ids appear in the correct set.
        -- All must match and counts must be equal — no extras, no missing.
        WHEN 'QuestionType.multiple_choice' THEN
            IF submit_option_length = original_option_length THEN

                SELECT COUNT(*) INTO match_count
                FROM unnest(original_options) correct_id
                WHERE correct_id = ANY(
                    ARRAY(
                        SELECT (option_data[j]->>'options_id')::UUID
                        FROM generate_series(1, submit_option_length) j
                    )
                );

                IF match_count = original_option_length THEN
                    question_status := 'Question.completed';
                ELSE
                    question_status := 'Question.failed';
                END IF;

            ELSE
                question_status := 'Question.failed';
            END IF;

        ELSE
            question_status := 'Question.failed';

    END CASE;

    -- ── [9] Persist final grade ───────────────────────────────────────────────
    UPDATE question_tracker_table
    SET question_tracker_question_status = question_status
    WHERE question_tracker_id = new_tracker_id;

    -- ── [10] Build and return result ──────────────────────────────────────────
    SELECT pt.* INTO pool_details
    FROM pools_table pt
    WHERE pt.pools_id = active_pool.pools_id;

    result := jsonb_set(result, '{status}',           '"Submission.success"');
    result := jsonb_set(result, '{question_status}',  to_jsonb(question_status));
    result := jsonb_set(result, '{pools_details}',    to_jsonb(pool_details));
    result := jsonb_set(result, '{options_selected}', to_jsonb(options_selected));  -- ← ADDED

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}',  to_jsonb(SQLERRM));
        result := jsonb_set(result, '{status}', '"Submission.error"');
        RETURN result;
END;
$function$

