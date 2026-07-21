-- schema:   public
-- function: get_user_daily_performance(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_user_daily_performance(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "error": null, "user_daily_performance": null, "called": "11500"}';
    quiz_count int;
    total_earning NUMERIC;
BEGIN
    -- Get count of quizzes and total earnings for the user in the last 24 hours
    SELECT  
      COUNT(pmt.pools_members_id),
      COALESCE(SUM(pmt.pools_members_paid_amount) FILTER (WHERE pmt.pools_members_paid_amount > 0), 0)
    INTO quiz_count, total_earning
    FROM pools_members_table pmt 
    LEFT JOIN pools_table pt ON pmt.pools_id = pt.pools_id
    WHERE pmt.users_id = p_user_id
    AND pt.pools_completed_at IS NOT NULL
    AND pmt.pools_members_created_at::TIMESTAMPTZ BETWEEN (NOW() - INTERVAL '24 Hours') AND NOW();

    -- Build the result JSON
    result := jsonb_set(result, '{user_daily_performance}', jsonb_build_object(
      'daily_performance_for_quiz', quiz_count,
      'daily_performance_for_earning', total_earning
    ), false);
    
    result := jsonb_set(result, '{status}', '"PerformanceStatus.success"', false);

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"PerformanceStatus.error"', false);
        RETURN result;
END;
$function$

