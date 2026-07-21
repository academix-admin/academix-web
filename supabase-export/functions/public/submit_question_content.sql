-- schema:   public
-- function: submit_question_content(p_country text, p_locale text, p_gender text, p_age text, p_country_control jsonb[], p_language_control jsonb[], p_gender_control jsonb[], p_age_control jsonb[], p_topic_id uuid, p_time_id uuid, p_type_id uuid, p_user_id uuid, p_public boolean, p_question_text text, p_options jsonb[], p_questions_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.submit_question_content(p_country text, p_locale text, p_gender text, p_age text, p_country_control jsonb[], p_language_control jsonb[], p_gender_control jsonb[], p_age_control jsonb[], p_topic_id uuid, p_time_id uuid, p_type_id uuid, p_user_id uuid, p_public boolean, p_question_text text, p_options jsonb[], p_questions_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE 
  result JSONB := '{"status": null, "error": null, "questions_details": null, "options_id_details": null}';
  group_id UUID;
  category_id UUID;
  question_id UUID;
  questions_details JSONB;
  options_id_details JSONB := '{}';
  option JSONB;
  saved_id UUID;
  i INT;
  id TEXT;
  identity_text TEXT;
  correct BOOLEAN;
  min NUMERIC;
  max NUMERIC;
  unit TEXT;
  age_control_json JSONB;
  language_control_json JSONB;
  gender_control_json JSONB;
  country_control_json JSONB;
  questions_identity_json JSONB;
  questions_created_by_json JSONB;
  questions_reviewed_by_json JSONB;
  is_update BOOLEAN := FALSE;

  -- Validation helpers
  provided_option_id UUID;
  bad_option_ids TEXT := '';
  missing_option_ids TEXT := '';
  actual_option_count INT;
BEGIN

    -- ---------------------------------------------------------------
    -- UPDATE MODE VALIDATION
    -- ---------------------------------------------------------------
    IF p_questions_id IS NOT NULL THEN

        -- 1. Check the question itself exists
        IF NOT EXISTS (
            SELECT 1 FROM questions_table WHERE questions_id = p_questions_id
        ) THEN
            result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
            result := jsonb_set(result, '{error}', '"Question not found for the provided p_questions_id"', false);
            RETURN result;
        END IF;

        -- 2. Every option in p_options must carry an options_id field
        IF p_options IS NOT NULL AND array_length(p_options, 1) > 0 THEN
            FOR i IN 1..array_length(p_options, 1) LOOP
                option := p_options[i];

                -- 2a. Reject any option that is missing the options_id field entirely
                IF (option->>'options_id') IS NULL THEN
                    result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
                    result := jsonb_set(result, '{error}',
                        to_jsonb('Option at index ' || i || ' is missing the required options_id field when p_questions_id is provided'),
                        false);
                    RETURN result;
                END IF;

                provided_option_id := (option->>'options_id')::UUID;

                -- 2b. Reject if the options_id does not exist in options_table
                --     AND is not linked to the given question
                IF NOT EXISTS (
                    SELECT 1 FROM options_table
                    WHERE options_id   = provided_option_id
                      AND questions_id = p_questions_id
                ) THEN
                    bad_option_ids := bad_option_ids || provided_option_id::TEXT || ', ';
                END IF;
            END LOOP;

            IF bad_option_ids <> '' THEN
                bad_option_ids := rtrim(bad_option_ids, ', ');
                result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
                result := jsonb_set(result, '{error}',
                    to_jsonb('The following options_id values do not exist or do not belong to question ' || p_questions_id::TEXT || ': ' || bad_option_ids),
                    false);
                RETURN result;
            END IF;

            -- 2c. The number of options provided must match the total options
            --     that actually belong to this question (no partial translations)
            SELECT COUNT(*) INTO actual_option_count
            FROM options_table
            WHERE questions_id = p_questions_id;

            IF array_length(p_options, 1) <> actual_option_count THEN
                result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
                result := jsonb_set(result, '{error}',
                    to_jsonb('Expected ' || actual_option_count || ' option(s) for this question but ' || array_length(p_options, 1) || ' were provided'),
                    false);
                RETURN result;
            END IF;
        END IF;

        is_update := TRUE;
        question_id := p_questions_id;
    END IF;


    -- Get group_id and category_id from topic
    SELECT tct.category_group_id, tct.topic_category_id INTO group_id, category_id 
    FROM topics_table tt 
    LEFT JOIN topic_category_table tct ON tt.topic_category_id = tct.topic_category_id
    WHERE tt.topics_id = p_topic_id;

    -- Generate control JSON objects
    age_control_json      := save_control_details('Control.age',      p_age_control,      p_locale);
    language_control_json := save_control_details('Control.language', p_language_control, p_locale);
    gender_control_json   := save_control_details('Control.gender',   p_gender_control,   p_locale);
    country_control_json  := save_control_details('Control.country',  p_country_control,  p_locale);

    IF is_update THEN
        -- ---------------------------------------------------------------
        -- UPDATE MODE: merge new locale into existing JSONB fields
        -- ---------------------------------------------------------------
        UPDATE questions_table
        SET
            questions_identity   = questions_identity   || jsonb_build_object(p_locale, p_question_text),
            questions_created_by = questions_created_by || jsonb_build_object(p_locale, p_user_id),
            approval_status = approval_status || jsonb_build_object(p_locale, 'Approval.open'),
            age_control          = age_control          || age_control_json,
            language_control     = language_control     || language_control_json,
            gender_control       = gender_control       || gender_control_json,
            country_control      = country_control      || country_control_json,
            questions_updated_at = NOW()
        WHERE questions_id = p_questions_id
        RETURNING 
            jsonb_build_object(
                'questions_id',         questions_id,
                'questions_image',      questions_image,
                'questions_created_at', questions_created_at,
                'questions_updated_at', questions_updated_at,
                'sort_created_id',      sort_created_id,
                'sort_updated_id',      sort_updated_id,
                'questions_text',       (SELECT * FROM reformat_text((SELECT translation FROM translate(questions_identity, p_locale)))),
                'approval',                  (SELECT translation FROM translate(approval_status, p_locale)),
                'reviewer_id',          (SELECT translation FROM translate(questions_reviewed_by, p_locale)),
                'topics_id',            topics_id,
                'option_simple_data',   0,
                'time_data', (
                    SELECT jsonb_build_object(
                        'question_time_id',    qtit.question_time_id,
                        'question_time_value', qtit.question_time_value
                    ) FROM question_time_table qtit 
                    WHERE qtit.question_time_id = questions_table.question_time_id
                ),
                'type_data', (
                    SELECT jsonb_build_object(
                        'question_type_id',       qtt.question_type_id,
                        'question_type_identity', (SELECT translation FROM translate(qtt.question_type_identity, p_locale))
                    ) FROM question_type_table qtt 
                    WHERE qtt.question_type_id = questions_table.question_type_id
                ),
                'creator_details',    get_user_fields(p_user_id, ARRAY['users_id', 'users_names', 'users_username', 'users_image']),
                'age_control',        (SELECT jsonb_agg(control) FROM build_control(questions_table.age_control,      p_locale) AS control),
                'country_control',    (SELECT jsonb_agg(control) FROM build_control(questions_table.country_control,  p_locale) AS control),
                'language_control',   (SELECT jsonb_agg(control) FROM build_control(questions_table.language_control, p_locale) AS control),
                'gender_control',     (SELECT jsonb_agg(control) FROM build_control(questions_table.gender_control,   p_locale) AS control)
            ) INTO questions_details;

    ELSE
        -- ---------------------------------------------------------------
        -- INSERT MODE: create a brand-new question
        -- ---------------------------------------------------------------
        questions_identity_json    := jsonb_build_object(p_locale, p_question_text);
        questions_created_by_json  := jsonb_build_object(p_locale, p_user_id);
        questions_reviewed_by_json := '{}'::jsonb;

        INSERT INTO questions_table (
            questions_identity,
            topics_id,
            category_group_id,
            topic_category_id,
            age_control,
            language_control,
            gender_control,
            country_control,
            questions_visible,
            approval_status,
            question_time_id,
            question_type_id,
            questions_created_by,
            questions_reviewed_by
        )
        VALUES (
            questions_identity_json,
            p_topic_id,
            group_id,
            category_id,
            age_control_json,
            language_control_json,
            gender_control_json,
            country_control_json,
            p_public,
            jsonb_build_object(p_locale, 'Approval.open'),
            p_time_id,
            p_type_id,
            questions_created_by_json,
            questions_reviewed_by_json
        )
        RETURNING 
            jsonb_build_object(
                'questions_id',         questions_id,
                'questions_image',      questions_image,
                'questions_created_at', questions_created_at,
                'questions_updated_at', questions_updated_at,
                'sort_created_id',      sort_created_id,
                'sort_updated_id',      sort_updated_id,
                'questions_text',       (SELECT * FROM reformat_text((SELECT translation FROM translate(questions_identity, p_locale)))),
                'approval',                  (SELECT translation FROM translate(approval_status, p_locale)),
                'reviewer_id',          (SELECT translation FROM translate(questions_reviewed_by, p_locale)),
                'topics_id',            topics_id,
                'option_simple_data',   0,
                'time_data', (
                    SELECT jsonb_build_object(
                        'question_time_id',    qtit.question_time_id,
                        'question_time_value', qtit.question_time_value
                    ) FROM question_time_table qtit 
                    WHERE qtit.question_time_id = questions_table.question_time_id
                ),
                'type_data', (
                    SELECT jsonb_build_object(
                        'question_type_id',       qtt.question_type_id,
                        'question_type_identity', (SELECT translation FROM translate(qtt.question_type_identity, p_locale))
                    ) FROM question_type_table qtt 
                    WHERE qtt.question_type_id = questions_table.question_type_id
                ),
                'creator_details',    get_user_fields(p_user_id, ARRAY['users_id', 'users_names', 'users_username', 'users_image']),
                'age_control',        (SELECT jsonb_agg(control) FROM build_control(questions_table.age_control,      p_locale) AS control),
                'country_control',    (SELECT jsonb_agg(control) FROM build_control(questions_table.country_control,  p_locale) AS control),
                'language_control',   (SELECT jsonb_agg(control) FROM build_control(questions_table.language_control, p_locale) AS control),
                'gender_control',     (SELECT jsonb_agg(control) FROM build_control(questions_table.gender_control,   p_locale) AS control)
            ), questions_id INTO questions_details, question_id;
    END IF;

    IF questions_details IS NULL THEN 
        result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
        RETURN result;
    END IF;

    -- ---------------------------------------------------------------
    -- OPTIONS
    -- ---------------------------------------------------------------
    IF question_id IS NOT NULL AND p_options IS NOT NULL AND array_length(p_options, 1) > 0 THEN 
        FOR i IN 1..array_length(p_options, 1) LOOP
            option        := p_options[i];
            id            := (option->>'id')::TEXT;
            identity_text := (option->>'option')::TEXT;
            correct       := (option->>'is_correct')::BOOLEAN;
            min           := (option->>'min')::NUMERIC;
            max           := (option->>'max')::NUMERIC;
            unit          := (option->>'unit')::TEXT;

            DECLARE
                options_identity_json JSONB;
                existing_option_id UUID;
            BEGIN
                IF is_update THEN
                    existing_option_id := (option->>'options_id')::UUID;

                    UPDATE options_table
                    SET options_identity = options_identity || jsonb_build_object(p_locale, identity_text)
                    WHERE options_id   = existing_option_id
                      AND questions_id = question_id
                    RETURNING options_id INTO saved_id;
                ELSE
                    options_identity_json := jsonb_build_object(p_locale, identity_text);

                    INSERT INTO options_table (
                        questions_id,
                        options_is_correct,
                        options_identity,
                        options_min,
                        options_max,
                        options_unit
                    ) VALUES (
                        question_id,
                        correct,
                        options_identity_json,
                        min,
                        max,
                        unit
                    ) RETURNING options_id INTO saved_id;
                END IF;

                IF saved_id IS NOT NULL THEN
                    options_id_details := jsonb_set(options_id_details, ARRAY[id], to_jsonb(saved_id::TEXT));
                END IF;
            END;
        END LOOP;
    END IF;

    -- Update option count
    questions_details := jsonb_set(
        questions_details, 
        '{option_simple_data}', 
        to_jsonb(COALESCE((SELECT count(*) FROM jsonb_object_keys(options_id_details)), 0)), 
        false
    );
    
    result := jsonb_set(result, '{status}', '"ContentSubmission.success"', false);
    result := jsonb_set(result, '{questions_details}', questions_details, false);
    result := jsonb_set(result, '{options_id_details}', options_id_details, false);

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
        RETURN result;
END;
$function$

