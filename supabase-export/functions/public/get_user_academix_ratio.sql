-- schema:   public
-- function: get_user_academix_ratio(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_user_academix_ratio(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "error": null, "academix_ratio": null, "called": "9200"}';

    -- Raw stats
    top_count INT := 0;
    mid_count INT := 0;
    bot_count INT := 0;
    rank_count INT := 0;
    point_sum NUMERIC := 0;
    fee_sum NUMERIC := 0;
    streak_count INT := 0;

    -- Computed scores
    streak_score NUMERIC := 0;
    top_score NUMERIC := 0;
    mid_score NUMERIC := 0;
    bot_score NUMERIC := 0;
    rank_score NUMERIC := 0;
    price_score NUMERIC := 0;
    points_score NUMERIC := 0;
    

    scale INT := 10;
    duration INT := 14;

    -- Final score
    raw_score NUMERIC := 0;
    academix_ratio NUMERIC := 0;

    two_weeks TIMESTAMPTZ := NOW() - (duration * INTERVAL '1 days');
BEGIN
    -- 1. Get streak count
    SELECT COUNT(*) INTO streak_count
    FROM daily_streaks_table
    WHERE users_id = p_user_id
      AND daily_streaks_created_at::TIMESTAMPTZ BETWEEN two_weeks AND NOW();

    -- 2. Get participation data
    SELECT 
        COUNT(*) FILTER (WHERE pmt.pools_members_category = 'Position.top'),
        COUNT(*) FILTER (WHERE pmt.pools_members_category = 'Position.mid'),
        COUNT(*) FILTER (WHERE pmt.pools_members_category = 'Position.bot'),
        COUNT(*) FILTER (WHERE pmt.pools_members_category = 'Position.rank'),
        COALESCE(SUM(pmt.pools_members_points), 0),
        COALESCE(SUM(pmt.pools_members_price), 0)
    INTO top_count, mid_count, bot_count, rank_count, point_sum, fee_sum
    FROM pools_members_table pmt
    WHERE pmt.users_id = p_user_id
      AND pmt.pools_members_created_at::TIMESTAMPTZ BETWEEN two_weeks AND NOW();

    -- 3. Normalize + Weight

    -- Streak Score (max streaks = duration) => scale to 0–1.5
    streak_score := LEAST(streak_count::NUMERIC / duration * 1.5, 1.5);

    -- Top participation (max scale) => scale to 0–3
    top_score := LEAST(top_count::NUMERIC / scale * 2, 2);

    -- Mid participation (max scale) => scale to 0–2
    mid_score := LEAST(mid_count::NUMERIC / scale * 1, 1);

    -- Bot participation (max scale) => scale to 0–1
    bot_score := LEAST(bot_count::NUMERIC / scale * 1, 1);

    -- Rank participation (max scale) => scale to 0–1
    -- Penalize rank count slightly
    rank_score := LEAST(rank_count::NUMERIC / scale * 1, 1) * -0.2;

    -- Price score (max scale) => scale to 0–0.75
    price_score := LEAST(fee_sum::NUMERIC / scale * 0.75, 0.75);

    -- Points score (max scale) => scale to 0–0.75
    points_score := LEAST(point_sum::NUMERIC / scale * 0.75, 0.75);

    -- 4. Combine into raw score
    raw_score := 
        streak_score + 
        top_score + 
        mid_score + 
        bot_score + 
        -- price_points_score +
        price_score +
        points_score +
        rank_score + 0.0;

    -- This will usually land between 0–10 if user performs moderately to very well
    academix_ratio := raw_score;

    -- 5. Return the result
    result := jsonb_set(result, '{academix_ratio}', to_jsonb(academix_ratio), false);
    result := jsonb_set(result, '{status}', '"AcademixRatio.success"', false);

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"AcademixRatio.error"', false);
        RETURN result;
END;
$function$

