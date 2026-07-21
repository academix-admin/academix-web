-- schema:   public
-- function: fetch_user_achievements(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_achievement_tab text, p_limit_by integer, p_after_achievements jsonb)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_user_achievements(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_achievement_tab text, p_limit_by integer, p_after_achievements jsonb)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sortID TEXT;
    direction TEXT;
BEGIN
    IF p_achievement_tab NOT IN ('AchievementTab.active','AchievementTab.pending','AchievementTab.completed') THEN 
       RETURN QUERY SELECT * FROM jsonb_array_elements('[]'::jsonb);
    END IF;

    -- Extract sort ID from the passed JSONB object
    sortID := (p_after_achievements->>'sort_id')::TEXT;
    direction := (p_after_achievements->>'direction')::TEXT;

    RETURN QUERY
    WITH filtered_achievements AS (
        SELECT
            at.achievements_id,
            at.achievements_type,
            at.sort_created_id,
            at.achievements_requirement,
            at.achievements_title,
            at.achievements_image,
            at.achievements_description,
            rt.reward_id,
            rt.reward_type,
            rt.reward_value,
            rt.reward_limit,
            rt.reward_instruction
        FROM achievements_table at
        LEFT JOIN reward_table rt ON rt.reward_id = at.reward_id
        WHERE 
            at.achievements_is_active = TRUE
            AND COALESCE((at.achievements_requirement->>'count')::INT, 0) > 0 
            AND (at.achievements_requirement IS NOT NULL
            AND at.achievements_requirement != '{}'::jsonb)
            AND (SELECT value FROM decontrol(at.country_control, p_country, p_locale)) = TRUE
            AND (SELECT value FROM decontrol(at.language_control, p_locale, p_locale)) = TRUE
            AND (sortID IS NULL 
                OR (
                    (direction = 'oldest' AND (at.sort_created_id)::TEXT < sortID::TEXT) 
                    OR (direction = 'latest' AND (at.sort_created_id)::TEXT > sortID::TEXT)
                ))
        ORDER BY 
            CASE 
                WHEN direction = 'oldest' OR direction IS NULL THEN at.sort_created_id
            END DESC,
            CASE 
                WHEN direction = 'latest' THEN at.sort_created_id
            END ASC
        LIMIT p_limit_by
    ),
    achievements_with_progress AS (
        SELECT 
            f.*,
            get_user_achievements_progress(p_user_id, f.achievements_id, f.achievements_requirement) AS progress
        FROM filtered_achievements f
    )
    SELECT jsonb_build_object(
        'achievements_id', a.achievements_id,
        'achievements_type', a.achievements_type,
        'sort_created_id', a.sort_created_id,
        'achievements_requirement', a.achievements_requirement,
        'achievements_image',a.achievements_image,
        'achievements_title', (translate(a.achievements_title, p_locale)).translation,
        'achievements_description', (translate(a.achievements_description, p_locale)).translation,
        'reward_details', jsonb_build_object(
            'reward_id', a.reward_id,
            'reward_type', a.reward_type,
            'reward_value', a.reward_value,
            'reward_limit', a.reward_limit,
            'reward_instruction', (translate(a.reward_instruction, p_locale)).translation
        ),                                        
        'achievements_progress_details', a.progress
    )
    FROM achievements_with_progress a
    WHERE (
        (p_achievement_tab = 'AchievementTab.completed' AND (a.progress->>'achievements_progress_rewarded')::BOOLEAN = TRUE) OR
        (p_achievement_tab = 'AchievementTab.pending' AND (a.progress->>'achievements_progress_rewarded')::BOOLEAN = FALSE AND (a.progress->>'achievements_progress_count')::INT = (a.progress->>'achievements_progress_required')::INT) OR
        (p_achievement_tab = 'AchievementTab.active' AND (a.progress->>'achievements_progress_count')::INT <> (a.progress->>'achievements_progress_required')::INT) 
    );
END;
$function$

