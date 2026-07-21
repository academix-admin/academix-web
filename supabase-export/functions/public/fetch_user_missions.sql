-- schema:   public
-- function: fetch_user_missions(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_mission_tab text, p_limit_by integer, p_after_missions jsonb)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_user_missions(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_mission_tab text, p_limit_by integer, p_after_missions jsonb)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  sortID TEXT;
  direction TEXT;
BEGIN
  IF p_mission_tab NOT IN ('MissionTab.active', 'MissionTab.pending', 'MissionTab.completed') THEN 
    RETURN QUERY SELECT * FROM jsonb_array_elements('[]'::jsonb);
  END IF;

  sortID := (p_after_missions->>'sort_id')::TEXT;
  direction := (p_after_missions->>'direction')::TEXT;

  RETURN QUERY
  WITH filtered_missions AS (
    SELECT
      mt.mission_id,
      mt.mission_type,
      mt.sort_created_id,
      mt.mission_requirement,
      mt.mission_title,
      mt.mission_image,
      mt.mission_description,
      rt.reward_id AS rt_reward_id,
      rt.reward_type,
      rt.reward_value,
      rt.reward_limit,
      rt.reward_instruction
    FROM mission_table mt
    LEFT JOIN reward_table rt ON rt.reward_id = mt.reward_id
    WHERE
      mt.mission_is_active = TRUE
      AND COALESCE((mt.mission_requirement->>'count')::INT, 0) > 0
      AND mt.mission_requirement IS NOT NULL
      AND mt.mission_requirement != '{}'::jsonb
      AND (SELECT value FROM decontrol(mt.country_control, p_country, p_locale)) = TRUE
      AND (SELECT value FROM decontrol(mt.language_control, p_locale, p_locale)) = TRUE
      AND (
        sortID IS NULL OR (
          (direction = 'oldest' AND (mt.sort_created_id)::TEXT < sortID)
          OR (direction = 'latest' AND (mt.sort_created_id)::TEXT > sortID)
        )
      )
    ORDER BY
      CASE
        WHEN direction = 'oldest' OR direction IS NULL THEN mt.sort_created_id
      END DESC,
      CASE
        WHEN direction = 'latest' THEN mt.sort_created_id
      END ASC
    LIMIT p_limit_by
  ),
  missions_with_progress AS (
    SELECT 
      f.*,
      get_user_mission_progress(p_user_id, f.mission_id, f.mission_requirement) AS progress
    FROM filtered_missions f
  )
  SELECT jsonb_build_object(
      'mission_id', m.mission_id,
      'mission_type', m.mission_type,
      'sort_created_id', m.sort_created_id,
      'mission_image',m.mission_image,
      'mission_requirement', m.mission_requirement,
      'mission_title', (translate(m.mission_title, p_locale)).translation,
      'mission_description', (translate(m.mission_description, p_locale)).translation,
      'reward_details', jsonb_build_object(
          'reward_id', m.rt_reward_id,
          'reward_type', m.reward_type,
          'reward_value', m.reward_value,
          'reward_limit', m.reward_limit,
          'reward_instruction', (translate(m.reward_instruction, p_locale)).translation
      ),
      'mission_progress_details', m.progress
    )
  FROM missions_with_progress m
  WHERE (
    (p_mission_tab = 'MissionTab.completed' AND (m.progress->>'mission_progress_rewarded')::BOOLEAN = TRUE) OR
    (p_mission_tab = 'MissionTab.pending' AND (m.progress->>'mission_progress_rewarded')::BOOLEAN = FALSE AND (m.progress->>'mission_progress_count')::INT = (m.progress->>'mission_progress_required')::INT) OR
    (p_mission_tab = 'MissionTab.active' AND (m.progress->>'mission_progress_count')::INT <> (m.progress->>'mission_progress_required')::INT) 
  );
END;
$function$

