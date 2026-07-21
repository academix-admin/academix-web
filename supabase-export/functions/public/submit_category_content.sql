-- schema:   public
-- function: submit_category_content(p_country text, p_locale text, p_gender text, p_age text, p_country_control jsonb[], p_language_control jsonb[], p_gender_control jsonb[], p_age_control jsonb[], p_group_id uuid, p_user_id uuid, p_public boolean, p_topic_category_text text, p_topic_category_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.submit_category_content(p_country text, p_locale text, p_gender text, p_age text, p_country_control jsonb[], p_language_control jsonb[], p_gender_control jsonb[], p_age_control jsonb[], p_group_id uuid, p_user_id uuid, p_public boolean, p_topic_category_text text, p_topic_category_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE 
  result JSONB := '{"status": null, "error": null, "category_details": null}';
  category_details JSONB;
  is_update BOOLEAN := FALSE;
  age_control_json JSONB;
  language_control_json JSONB;
  gender_control_json JSONB;
  country_control_json JSONB;
BEGIN

    -- ---------------------------------------------------------------
    -- UPDATE MODE VALIDATION
    -- ---------------------------------------------------------------
    IF p_topic_category_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM topic_category_table WHERE topic_category_id = p_topic_category_id
        ) THEN
            result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
            result := jsonb_set(result, '{error}', '"Category not found for the provided p_topic_category_id"', false);
            RETURN result;
        END IF;

        is_update := TRUE;
    END IF;


    -- Generate control JSON objects
    age_control_json      := save_control_details('Control.age',      p_age_control,      p_locale);
    language_control_json := save_control_details('Control.language', p_language_control, p_locale);
    gender_control_json   := save_control_details('Control.gender',   p_gender_control,   p_locale);
    country_control_json  := save_control_details('Control.country',  p_country_control,  p_locale);

    IF is_update THEN
        -- ---------------------------------------------------------------
        -- UPDATE MODE: merge new locale into existing identity
        -- ---------------------------------------------------------------
        UPDATE topic_category_table
        SET
            topic_category_identity = topic_category_identity || jsonb_build_object(p_locale, p_topic_category_text),
            topic_category_created_by = topic_category_created_by || jsonb_build_object(p_locale, p_user_id),
            approval_status = approval_status || jsonb_build_object(p_locale, 'Approval.open'),
            age_control              = age_control              || age_control_json,
            language_control         = language_control         || language_control_json,
            gender_control           = gender_control           || gender_control_json,
            country_control          = country_control          || country_control_json,
            topic_category_updated_at = NOW()
        WHERE topic_category_id = p_topic_category_id
        RETURNING
            jsonb_build_object(
                'topic_category_id',         topic_category_id,
                'topic_category_image',      topic_category_image,
                'topic_category_created_at', topic_category_created_at,
                'topic_category_updated_at', topic_category_updated_at,
                'topic_category_identity',   (SELECT translation FROM translate(topic_category_identity,   p_locale)),
                'sort_created_id',           sort_created_id,
                'sort_updated_id',           sort_updated_id,
                'reviewer_id',               (SELECT translation FROM translate(topic_category_reviewed_by, p_locale)),
                'approval',                  (SELECT translation FROM translate(approval_status, p_locale)),
                'user_created_topic',        0,
                'user_created_question',     0,
                'topic_settings', jsonb_build_object(
                    'is_favourite',        FALSE,
                    'is_recents',          FALSE,
                    'settings_updated_at', NULL
                ),
                'creator_details',    get_user_fields(p_user_id, ARRAY['users_id', 'users_names', 'users_username', 'users_image']),
                'age_control',        (SELECT jsonb_agg(control) FROM build_control(topic_category_table.age_control,      p_locale) AS control),
                'country_control',    (SELECT jsonb_agg(control) FROM build_control(topic_category_table.country_control,  p_locale) AS control),
                'language_control',   (SELECT jsonb_agg(control) FROM build_control(topic_category_table.language_control, p_locale) AS control),
                'gender_control',     (SELECT jsonb_agg(control) FROM build_control(topic_category_table.gender_control,   p_locale) AS control),
                'category_group_details', (
                    SELECT jsonb_build_object(
                        'category_group_id',       cgt.category_group_id,
                        'category_group_identity', (SELECT translation FROM translate(cgt.category_group_identity, p_locale))
                    ) FROM category_group_table cgt
                    WHERE cgt.category_group_id = p_group_id
                )
            ) INTO category_details;

    ELSE
        -- ---------------------------------------------------------------
        -- INSERT MODE: create a brand-new category
        -- ---------------------------------------------------------------
        INSERT INTO topic_category_table (
            topic_category_identity,
            topic_category_created_by,
            topic_category_reviewed_by,
            category_group_id,
            age_control,
            language_control,
            gender_control,
            country_control,
            topic_category_visible,
            approval_status
        )
        VALUES (
            jsonb_build_object(p_locale, p_topic_category_text),
            jsonb_build_object(p_locale, p_user_id),
            '{}'::jsonb,
            p_group_id,
            age_control_json,
            language_control_json,
            gender_control_json,
            country_control_json,
            p_public,
            json_build_object(p_locale, 'Approval.open')
        )
        RETURNING
            jsonb_build_object(
                'topic_category_id',         topic_category_id,
                'topic_category_image',      topic_category_image,
                'topic_category_created_at', topic_category_created_at,
                'topic_category_updated_at', topic_category_updated_at,
                'topic_category_identity',   (SELECT translation FROM translate(topic_category_identity,   p_locale)),
                'sort_created_id',           sort_created_id,
                'sort_updated_id',           sort_updated_id,
                'reviewer_id',               (SELECT translation FROM translate(topic_category_reviewed_by, p_locale)),
                'approval',                  (SELECT translation FROM translate(approval_status, p_locale)),
                'user_created_topic',        0,
                'user_created_question',     0,
                'topic_settings', jsonb_build_object(
                    'is_favourite',        FALSE,
                    'is_recents',          FALSE,
                    'settings_updated_at', NULL
                ),
                'creator_details',    get_user_fields(p_user_id, ARRAY['users_id', 'users_names', 'users_username', 'users_image']),
                'age_control',        (SELECT jsonb_agg(control) FROM build_control(age_control,      p_locale) AS control),
                'country_control',    (SELECT jsonb_agg(control) FROM build_control(country_control,  p_locale) AS control),
                'language_control',   (SELECT jsonb_agg(control) FROM build_control(language_control, p_locale) AS control),
                'gender_control',     (SELECT jsonb_agg(control) FROM build_control(gender_control,   p_locale) AS control),
                'category_group_details', (
                    SELECT jsonb_build_object(
                        'category_group_id',       cgt.category_group_id,
                        'category_group_identity', (SELECT translation FROM translate(cgt.category_group_identity, p_locale))
                    ) FROM category_group_table cgt
                    WHERE cgt.category_group_id = p_group_id
                )
            ) INTO category_details;
    END IF;

    IF category_details IS NULL THEN 
        result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
        RETURN result;
    END IF;

    result := jsonb_set(result, '{status}', '"ContentSubmission.success"', false);
    result := jsonb_set(result, '{category_details}', category_details, false);

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
        RETURN result;
END;
$function$

