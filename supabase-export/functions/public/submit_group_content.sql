-- schema:   public
-- function: submit_group_content(p_country text, p_locale text, p_gender text, p_age text, p_country_control jsonb[], p_language_control jsonb[], p_gender_control jsonb[], p_age_control jsonb[], p_user_id uuid, p_public boolean, p_group_text text, p_group_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.submit_group_content(p_country text, p_locale text, p_gender text, p_age text, p_country_control jsonb[], p_language_control jsonb[], p_gender_control jsonb[], p_age_control jsonb[], p_user_id uuid, p_public boolean, p_group_text text, p_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE 
  result JSONB := '{"status": null, "error": null, "group_details": null}';
  group_details JSONB;
  is_update BOOLEAN := FALSE;
  age_control_json JSONB;
  language_control_json JSONB;
  gender_control_json JSONB;
  country_control_json JSONB;
BEGIN

    -- ---------------------------------------------------------------
    -- UPDATE MODE VALIDATION
    -- ---------------------------------------------------------------
    IF p_group_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM category_group_table WHERE category_group_id = p_group_id
        ) THEN
            result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
            result := jsonb_set(result, '{error}', '"Group not found for the provided p_group_id"', false);
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
        UPDATE category_group_table
        SET
            category_group_identity   = category_group_identity   || jsonb_build_object(p_locale, p_group_text),
            category_group_created_by = category_group_created_by || jsonb_build_object(p_locale, p_user_id),
            approval_status = approval_status || jsonb_build_object(p_locale, 'Approval.open'),
            age_control               = age_control               || age_control_json,
            language_control          = language_control          || language_control_json,
            gender_control            = gender_control            || gender_control_json,
            country_control           = country_control           || country_control_json,
            category_group_updated_at = NOW()
        WHERE category_group_id = p_group_id
        RETURNING
            jsonb_build_object(
                'category_group_id',         category_group_id,
                'category_group_identity',   (SELECT translation FROM translate(category_group_identity,   p_locale)),
                'category_group_created_at', category_group_created_at,
                'category_group_updated_at', category_group_updated_at,
                'sort_created_id',           sort_created_id,
                'sort_updated_id',           sort_updated_id,
                'reviewer_id',               (SELECT translation FROM translate(category_group_reviewed_by, p_locale)),
                'group_category',            '[]'::JSONB,
                'approval',                  (SELECT translation FROM translate(approval_status, p_locale)),
                'creator_details',           get_user_fields(p_user_id, ARRAY['users_id', 'users_names', 'users_username', 'users_image']),
                'age_control',        (SELECT jsonb_agg(control) FROM build_control(category_group_table.age_control,      p_locale) AS control),
                'country_control',    (SELECT jsonb_agg(control) FROM build_control(category_group_table.country_control,  p_locale) AS control),
                'language_control',   (SELECT jsonb_agg(control) FROM build_control(category_group_table.language_control, p_locale) AS control),
                'gender_control',     (SELECT jsonb_agg(control) FROM build_control(category_group_table.gender_control,   p_locale) AS control)
            ) INTO group_details;

    ELSE
        -- ---------------------------------------------------------------
        -- INSERT MODE: create a brand-new group
        -- ---------------------------------------------------------------
        INSERT INTO category_group_table (
            category_group_identity,
            category_group_created_by,
            category_group_reviewed_by,
            age_control,
            language_control,
            gender_control,
            country_control,
            category_group_visible,
            approval_status
        )
        VALUES (
            jsonb_build_object(p_locale, p_group_text),
            jsonb_build_object(p_locale, p_user_id),
            '{}'::jsonb,
            age_control_json,
            language_control_json,
            gender_control_json,
            country_control_json,
            p_public,
            json_build_object(p_locale, 'Approval.open')
        )
        RETURNING
            jsonb_build_object(
                'category_group_id',         category_group_id,
                'category_group_identity',   (SELECT translation FROM translate(category_group_identity,   p_locale)),
                'category_group_created_at', category_group_created_at,
                'category_group_updated_at', category_group_updated_at,
                'sort_created_id',           sort_created_id,
                'sort_updated_id',           sort_updated_id,
                'reviewer_id',               (SELECT translation FROM translate(category_group_reviewed_by, p_locale)),
                'group_category',            '[]'::JSONB,
                'approval',                  (SELECT translation FROM translate(approval_status, p_locale)),
                'creator_details',           get_user_fields(p_user_id, ARRAY['users_id', 'users_names', 'users_username', 'users_image']),
                'age_control',        (SELECT jsonb_agg(control) FROM build_control(age_control,      p_locale) AS control),
                'country_control',    (SELECT jsonb_agg(control) FROM build_control(country_control,  p_locale) AS control),
                'language_control',   (SELECT jsonb_agg(control) FROM build_control(language_control, p_locale) AS control),
                'gender_control',     (SELECT jsonb_agg(control) FROM build_control(gender_control,   p_locale) AS control)
            ) INTO group_details;
    END IF;

    IF group_details IS NULL THEN 
        result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
        RETURN result;
    END IF;

    result := jsonb_set(result, '{status}', '"ContentSubmission.success"', false);
    result := jsonb_set(result, '{group_details}', group_details, false);

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"ContentSubmission.error"', false);
        RETURN result;
END;
$function$

