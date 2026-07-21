-- schema:   public
-- function: get_user_streaks(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_user_streaks(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_sun_date DATE;
    v_today DATE := CURRENT_DATE;
    v_max_streak INT := 30;
BEGIN
    -- Calculate the most recent Sunday
    v_sun_date := v_today - (EXTRACT(DOW FROM v_today)::int * INTERVAL '1 day');

    RETURN QUERY
    SELECT jsonb_build_object(
        'daily_streaks_count', COALESCE(dst.daily_streaks_count, 0),
        'daily_streaks_max', v_max_streak,
        'daily_streaks_date_number', EXTRACT(DOW FROM days.day)::int + 1,
        'daily_streaks_created_at', dst.daily_streaks_created_at,
        'daily_streaks_date', to_char(days.day, 'YYYY-MM-DD'),
        'daily_streaks_status',
            CASE
                WHEN days.day < v_today AND dst.daily_streaks_created_at IS NULL THEN 'missed'
                WHEN days.day < v_today AND dst.daily_streaks_created_at IS NOT NULL THEN 'saved'
                WHEN days.day > v_today AND dst.daily_streaks_created_at IS NULL THEN 'future'
                ELSE 'today'
            END,
        'daily_streaks_reached', COALESCE(dst.daily_streaks_reached,FALSE),
        'daily_streaks_awarded', COALESCE(dst.daily_streaks_awarded,0.0)::NUMERIC,
        'redeem_code_details', jsonb_build_object(
            'redeem_code_id', rct.redeem_code_id,
            'redeem_code_value', rct.redeem_code_value,
            'redeem_code_expires', rct.redeem_code_expires
        )
    )
    FROM generate_series(v_sun_date, v_sun_date + interval '6 days', interval '1 day') AS days(day)
    LEFT JOIN public.daily_streaks_table dst
      ON dst.streak_date = days.day
     AND dst.users_id = p_user_id
     LEFT JOIN redeem_code_table rct ON rct.redeem_code_id = dst.redeem_code_id
    ORDER BY days.day;
END;
$function$

