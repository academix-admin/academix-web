-- schema:   public
-- function: get_user_achievements_count(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_user_achievements_count(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "error": null, "achievements_data": null, "called": "5200"}'; -- Default result structure
    achievements_data JSONB;
    achievements_count INT;
    finshed_count INT;
    not_rewarded_count INT;
BEGIN


    -- Get total available achievements count

        SELECT COUNT(*) 
        FROM achievements_table at
        INTO achievements_count
        WHERE at.achievements_is_active = TRUE
          AND COALESCE((at.achievements_requirement->>'count')::INT, 0) > 0 
          AND (SELECT value FROM decontrol(at.country_control,p_country,p_locale)) = TRUE
          AND (SELECT value FROM decontrol(at.language_control,p_locale,p_locale)) = TRUE;
    

    -- Get user's finsihed and not rewarded achievements count
    SELECT 
        COUNT(*) FILTER (WHERE achievements_progress_completed = TRUE),
        COUNT(*) FILTER (WHERE achievements_progress_rewarded = FALSE)
    INTO finshed_count, not_rewarded_count
    FROM achievements_progress_table
    WHERE users_id = p_user_id;

    -- Build the response
    result := jsonb_set(result, '{achievements_data}', 
        jsonb_build_object(
            'achievements_count', achievements_count,
            'achievements_finished', finshed_count,
            'achievements_not_rewarded', not_rewarded_count,
            'achievements_completed',  finshed_count - not_rewarded_count
        ), 
        false
    );

    result := jsonb_set(result, '{status}', '"AchievementStatus.success"', false);  

    -- Return the final result
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Catch unexpected errors and update the result
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false); -- Include the error message
        result := jsonb_set(result, '{status}', '"AchievementStatus.error"', false);  -- Set status to failed
        RETURN result;
END;
$function$

