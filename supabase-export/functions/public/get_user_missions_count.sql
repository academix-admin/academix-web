-- schema:   public
-- function: get_user_missions_count(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_user_missions_count(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "error": null, "mission_data": null, "called": "3200"}'; -- Default result structure
    mission_data JSONB;
    mission_count INT;
    finshed_count INT;
    not_rewarded_count INT;
BEGIN


    -- Get total available missions count

        SELECT COUNT(*) 
        FROM mission_table mt
        INTO mission_count
        WHERE mt.mission_is_active = TRUE
          AND COALESCE((mt.mission_requirement->>'count')::INT, 0) > 0 
          AND (SELECT value FROM decontrol(mt.country_control,p_country, p_locale)) = TRUE
          AND (SELECT value FROM decontrol(mt.language_control,p_locale, p_locale)) = TRUE;
    

    -- Get user's finsihed and not rewarded missions count
    SELECT 
        COUNT(*) FILTER (WHERE mission_progress_completed = TRUE),
        COUNT(*) FILTER (WHERE mission_progress_rewarded = FALSE)
    INTO finshed_count, not_rewarded_count
    FROM mission_progress_table
    WHERE users_id = p_user_id;

    -- Build the response
    result := jsonb_set(result, '{mission_data}', 
        jsonb_build_object(
            'mission_count', mission_count,
            'mission_finished', finshed_count,
            'mission_not_rewarded', not_rewarded_count,
            'mission_completed',  finshed_count - not_rewarded_count
        ), 
        false
    );

    result := jsonb_set(result, '{status}', '"MissionStatus.success"', false);  

    -- Return the final result
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Catch unexpected errors and update the result
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false); -- Include the error message
        result := jsonb_set(result, '{status}', '"MissionStatus.error"', false);  -- Set status to failed
        RETURN result;
END;
$function$

