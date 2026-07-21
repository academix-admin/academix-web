-- schema:   public
-- function: update_user_achievements_progress(p_user_id uuid, p_progress_data jsonb)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.update_user_achievements_progress(p_user_id uuid, p_progress_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_achievement RECORD;
  v_progress_id UUID;
  v_current_progress INT;
  v_required_count INT;
  v_requirement JSONB;
  v_is_completed BOOLEAN;
  v_updated_count INT := 0;
  v_achievements_types TEXT[];
  v_result JSONB := '{"status": "success", "updated_achievements": []}';
BEGIN
  -- Validate input data
  IF p_user_id IS NULL OR p_progress_data IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Invalid input parameters');
  END IF;

  -- Extract achievements types safely
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(p_progress_data->'types')
  ) INTO v_achievements_types;
  
  -- Process relevant achievements in a single query
  FOR v_achievement IN
    SELECT 
      at.achievements_id,
      at.achievements_type,
      (at.achievements_requirement)::JSONB as v_requirement,
      apt.achievements_progress_id,
      COALESCE((apt.achievements_progress_value->>'count')::INT, 0) as current_progress,
      COALESCE(apt.achievements_progress_completed, FALSE) as is_completed
    FROM achievements_table at
    LEFT JOIN achievements_progress_table apt 
      ON apt.users_id = p_user_id 
      AND apt.achievements_id = at.achievements_id
    WHERE at.achievements_is_active = TRUE
      AND jsonb_typeof(at.achievements_requirement) = 'object'
      AND (at.achievements_requirement->>'count')::INT > 0
      AND at.achievements_type = ANY(v_achievements_types)
      AND (apt.achievements_progress_id IS NULL OR NOT apt.achievements_progress_completed)
  LOOP

    -- Skip if already completed
    CONTINUE WHEN v_achievement.is_completed;
    
    v_requirement := v_achievement.v_requirement;

    -- Skip if requirements not met for top_category
    IF v_achievement.achievements_type = 'AchievementType.first_top' THEN
      IF (v_requirement->>'rank_category') IS NULL OR (p_progress_data->>'rank_category') IS NULL THEN
        CONTINUE;
      ELSIF (v_requirement->>'rank_category')::TEXT <> (p_progress_data->>'rank_category')::TEXT THEN
        CONTINUE;
      END IF;
      -- More achievement-specific validations can be added here
    END IF;

    -- Calculate new progress
    v_required_count := (v_requirement->>'count')::INT;
    v_current_progress := v_achievement.current_progress + 1;
    v_is_completed := v_current_progress >= v_required_count;
    
    -- Insert or update progress
    IF v_achievement.achievements_progress_id IS NULL THEN
      INSERT INTO achievements_progress_table(
        users_id, achievements_id, achievements_progress_value,
        achievements_progress_completed
      )
      VALUES (
        p_user_id, v_achievement.achievements_id, jsonb_build_object('count', v_current_progress),
        v_is_completed
      )
      RETURNING achievements_progress_id INTO v_progress_id;
    ELSE
      UPDATE achievements_progress_table
      SET 
        achievements_progress_value = jsonb_build_object('count', v_current_progress),
        achievements_progress_completed = v_is_completed,
        achievements_progress_updated_at = NOW()
      WHERE achievements_progress_id = v_achievement.achievements_progress_id;
    END IF;

    -- Record updated achievements
    v_result := jsonb_set(
      v_result,
      '{updated_achievements}',
      (v_result->'updated_achievements') || jsonb_build_object(
        'achievements_id', v_achievement.achievements_id,
        'new_progress', v_current_progress,
        'completed', v_is_completed
      )
    );

    v_updated_count := v_updated_count + 1;
  END LOOP;

  -- Add total count
  v_result := jsonb_set(v_result, '{count}', to_jsonb(v_updated_count));
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM,
      'count', v_updated_count,
      'updated_achievements', v_result->'updated_achievements'
    );
END;
$function$

