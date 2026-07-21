-- schema:   public
-- function: get_engagement_level_info_by_points(p_points numeric, p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_engagement_level_info_by_points(p_points numeric, p_locale text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_result JSONB;
    v_current_level RECORD;
    v_next_level RECORD;
    v_progress NUMERIC;
    v_points_to_next NUMERIC;
BEGIN
    -- Get current engagement level information
    SELECT * INTO v_current_level
    FROM engagement_levels_table elt
    WHERE (engagement_levels_max_points IS NULL AND p_points >= (SELECT MAX(engagement_levels_max_points) FROM engagement_levels_table WHERE engagement_levels_max_points IS NOT NULL))
       OR (p_points < engagement_levels_max_points AND (
           engagement_levels_id = (SELECT engagement_levels_id FROM engagement_levels_table ORDER BY engagement_levels_max_points ASC NULLS LAST LIMIT 1) -- First level
           OR p_points >= (SELECT MAX(engagement_levels_max_points) FROM engagement_levels_table WHERE engagement_levels_max_points < elt.engagement_levels_max_points)
       ))
    ORDER BY engagement_levels_max_points ASC NULLS LAST
    LIMIT 1;
    
    -- Get next engagement level information (if exists)
    SELECT * INTO v_next_level
    FROM engagement_levels_table
    WHERE engagement_levels_max_points > v_current_level.engagement_levels_max_points
    ORDER BY engagement_levels_max_points ASC NULLS LAST
    LIMIT 1;

    -- Calculate progress percentage
    IF v_current_level.engagement_levels_max_points IS NULL THEN
        -- Highest level case
        v_progress := 100;
        v_points_to_next := 0;
    ELSE
        v_progress := LEAST(
            (p_points - COALESCE(
                (SELECT MAX(engagement_levels_max_points) FROM engagement_levels_table WHERE engagement_levels_max_points < v_current_level.engagement_levels_max_points),
                0
            )) /
            (v_current_level.engagement_levels_max_points - COALESCE(
                (SELECT MAX(engagement_levels_max_points) FROM engagement_levels_table WHERE engagement_levels_max_points < v_current_level.engagement_levels_max_points),
                0
            )) * 100, 100
        );
        v_points_to_next := GREATEST(v_current_level.engagement_levels_max_points - p_points, 0);
    END IF;

    -- Build the result JSON
    v_result := jsonb_build_object(
        'engagement_levels_id', v_current_level.engagement_levels_id,
        'engagement_levels_identity', (SELECT translation FROM translate(v_current_level.engagement_levels_identity,p_locale)),
        'current_points', p_points,
        'current_progress_percent', v_progress,
        'next_engagement_levels_id', v_next_level.engagement_levels_id,
        'next_engagement_levels_identity', (SELECT translation FROM translate(v_next_level.engagement_levels_identity,p_locale)),
        'points_to_next_level', v_points_to_next
    );

    RETURN v_result;
END;
$function$

