-- schema:   public
-- function: update_user_email(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_email text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.update_user_email(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "profile_value": null, "error": null}';
    updated_email TEXT;
BEGIN
    -- Validate required parameters
    IF p_user_id IS NULL OR p_email IS NULL OR p_email = '' THEN
        result := jsonb_set(result, '{status}', '"ProfileStatus.invalid_parameters"', false);
        RETURN result;
    END IF;

    -- Update the full name
    UPDATE users_table 
    SET users_email = p_email 
    WHERE users_id = p_user_id AND users_login_type <> 'UserLoginType.email'
    RETURNING users_email INTO updated_email;

    -- Check if any row was actually updated
    IF NOT FOUND THEN
        result := jsonb_set(result, '{status}', '"ProfileStatus.denied"', false);
        RETURN result;
    END IF;

    result := jsonb_set(result, '{status}', '"ProfileStatus.success"', false);
    result := jsonb_set(result, '{profile_value}', to_jsonb(updated_email), false);
    
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"ProfileStatus.error"', false);
        RETURN result;
END;
$function$

