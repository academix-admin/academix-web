-- schema:   public
-- function: submit_topic_content(p_country text, p_locale text, p_gender text, p_age text, p_country_control jsonb[], p_language_control jsonb[], p_gender_control jsonb[], p_age_control jsonb[], p_category_id uuid, p_user_id uuid, p_public boolean, p_topic_text text, p_topics_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.submit_topic_content(p_country text, p_locale text, p_gender text, p_age text, p_country_control jsonb[], p_language_control jsonb[], p_gender_control jsonb[], p_age_control jsonb[], p_category_id uuid, p_user_id uuid, p_public boolean, p_topic_text text, p_topics_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE 
  result JSONB := '{"status": null, "error": null, "topics_details": null}';
  group_id UUID;
  topics_details JSONB;
  is_update BOOLEAN := FALSE;
  age_control_json JSONB;
  language_control_json JSONB;
  gender_control_json JSONB;
  country_control_json JSONB;
BEGIN

    -- ---------------------------------------------------------------
    -- UPDATE MODE VALIDATION
    -- ---------------------------------------------------------------
    IF p_topics_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM topics_table WHERE topics_id = p_topics_id
        ) THEN
            result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
            result := jsonb_set(result, '{error}', '"Topic not found for the provided p_topics_id"', false);
            RETURN result;
        END IF;

        is_update := TRUE;
    END IF;


    -- Get group_id from category
    SELECT tct.category_group_id INTO group_id 
    FROM topic_category_table tct 
    WHERE tct.topic_category_id = p_category_id;

    -- Generate control JSON objects
    age_control_json      := save_control_details('Control.age',      p_age_control,      p_locale);
    language_control_json := save_control_details('Control.language', p_language_control, p_locale);
    gender_control_json   := save_control_details('Control.gender',   p_gender_control,   p_locale);
    country_control_json  := save_control_details('Control.country',  p_country_control,  p_locale);

    IF is_update THEN
        -- ---------------------------------------------------------------
        -- UPDATE MODE: merge new locale into existing topics_identity
        -- ---------------------------------------------------------------
        UPDATE topics_table
        SET
            topics_identity   = topics_identity   || jsonb_build_object(p_locale, p_topic_text),
            topics_created_by = topics_created_by || jsonb_build_object(p_locale, p_user_id),
            approval_status = approval_status || jsonb_build_object(p_locale, 'Approval.open'),
            age_control       = age_control       || age_control_json,
            language_control  = language_control  || language_control_json,
            gender_control    = gender_control    || gender_control_json,
            country_control   = country_control   || country_control_json,
            topics_updated_at = NOW()
        WHERE topics_id = p_topics_id
        RETURNING
            jsonb_build_object(
                'topics_id',             topics_id,
                'topics_image',          topics_image,
                'topics_created_at',     topics_created_at,
                'topics_updated_at',     topics_updated_at,
                'sort_created_id',       sort_created_id,
                'sort_updated_id',       sort_updated_id,
                'topics_identity',       (SELECT translation FROM translate(topics_identity,  p_locale)),
                'approval',                  (SELECT translation FROM translate(approval_status, p_locale)),
                'reviewer_id',           (SELECT translation FROM translate(topics_reviewed_by, p_locale)),
                'topic_category_id',     topic_category_id,
                'user_created_question', 0,
                'general_questions',     0,
                'topic_settings', jsonb_build_object(
                    'is_favourite',        FALSE,
                    'is_recents',          FALSE,
                    'settings_updated_at', NULL
                ),
                'creator_details',    get_user_fields(p_user_id, ARRAY['users_id', 'users_names', 'users_username', 'users_image']),
                'age_control',        (SELECT jsonb_agg(control) FROM build_control(topics_table.age_control,      p_locale) AS control),
                'country_control',    (SELECT jsonb_agg(control) FROM build_control(topics_table.country_control,  p_locale) AS control),
                'language_control',   (SELECT jsonb_agg(control) FROM build_control(topics_table.language_control, p_locale) AS control),
                'gender_control',     (SELECT jsonb_agg(control) FROM build_control(topics_table.gender_control,   p_locale) AS control)
            ) INTO topics_details;

    ELSE
        -- ---------------------------------------------------------------
        -- INSERT MODE: create a brand-new topic
        -- ---------------------------------------------------------------
        INSERT INTO topics_table (
            topics_identity,
            topics_created_by,
            topics_reviewed_by,
            category_group_id,
            topic_category_id,
            age_control,
            language_control,
            gender_control,
            country_control,
            topics_visible,
            approval_status
        )
        VALUES (
            jsonb_build_object(p_locale, p_topic_text),
            jsonb_build_object(p_locale, p_user_id),
            '{}'::jsonb,
            group_id,
            p_category_id,
            age_control_json,
            language_control_json,
            gender_control_json,
            country_control_json,
            p_public,
            jsonb_build_object(p_locale, 'Aprroval.open')
        )
        RETURNING
            jsonb_build_object(
                'topics_id',             topics_id,
                'topics_image',          topics_image,
                'topics_created_at',     topics_created_at,
                'topics_updated_at',     topics_updated_at,
                'sort_created_id',       sort_created_id,
                'sort_updated_id',       sort_updated_id,
                'topics_identity',       (SELECT translation FROM translate(topics_identity,    p_locale)),
                'approval',                  (SELECT translation FROM translate(approval_status, p_locale)),
                'reviewer_id',           (SELECT translation FROM translate(topics_reviewed_by, p_locale)),
                'topic_category_id',     topic_category_id,
                'user_created_question', 0,
                'general_questions',     0,
                'topic_settings', jsonb_build_object(
                    'is_favourite',        FALSE,
                    'is_recents',          FALSE,
                    'settings_updated_at', NULL
                ),
                'creator_details',    get_user_fields(p_user_id, ARRAY['users_id', 'users_names', 'users_username', 'users_image']),
                'age_control',        (SELECT jsonb_agg(control) FROM build_control(age_control,      p_locale) AS control),
                'country_control',    (SELECT jsonb_agg(control) FROM build_control(country_control,  p_locale) AS control),
                'language_control',   (SELECT jsonb_agg(control) FROM build_control(language_control, p_locale) AS control),
                'gender_control',     (SELECT jsonb_agg(control) FROM build_control(gender_control,   p_locale) AS control)
            ) INTO topics_details;
    END IF;

    IF topics_details IS NULL THEN 
        result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
        RETURN result;
    END IF;

    result := jsonb_set(result, '{status}', '"ContentSubmission.success"', false);
    result := jsonb_set(result, '{topics_details}', topics_details, false);

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
        RETURN result;
END;
$function$

