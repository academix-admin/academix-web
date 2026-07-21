-- schema:   public
-- function: get_user_engagement(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_user_engagement(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "error": null, "user_engagement_details": null, "called": "10200"}';
    user_engagement_details JSONB;
BEGIN
    

    SELECT  json_build_object(
      'user_engagement_progress_points_details',get_engagement_level_info_by_points(upt.user_engagement_progress_points,p_locale),
      'user_engagement_progress_questions',upt.user_engagement_progress_questions,
      'user_engagement_progress_quiz_count',upt.user_engagement_progress_quiz_count,
      'user_engagement_progress_time',upt.user_engagement_progress_time,
      'user_engagement_total_time',upt.user_engagement_total_time,
      'user_engagement_total_questions',upt.user_engagement_total_questions,
      'user_engagement_progress_win_count',upt.user_engagement_progress_win_count
    )  
    INTO user_engagement_details
    FROM user_engagement_progress_table upt 
    WHERE upt.users_id = p_user_id;

    IF user_engagement_details IS NULL THEN 
       user_engagement_details := json_build_object(
      'user_engagement_progress_points_details', get_engagement_level_info_by_points(0,p_locale),
      'user_engagement_progress_questions',0,
      'user_engagement_progress_quiz_count',0,
      'user_engagement_progress_time',0,
      'user_engagement_total_time', 0,
      'user_engagement_total_questions', 0,
      'user_engagement_progress_win_count', 0      
    );  
    END IF;

    -- 5. Return the result
    result := jsonb_set(result, '{user_engagement_details}', to_jsonb(user_engagement_details), false);
    result := jsonb_set(result, '{status}', '"EngagementStatus.success"', false);

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"EngagementStatus.error"', false);
        RETURN result;
END;
$function$

