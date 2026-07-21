-- schema:   public
-- function: update_user_mission_progress(p_user_id uuid, p_progress_data jsonb)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.update_user_mission_progress(p_user_id uuid, p_progress_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_mission RECORD;
  v_progress_id UUID;
  v_current_progress INT;
  v_required_count INT;
  v_requirement JSONB;
  v_is_completed BOOLEAN;
  v_updated_count INT := 0;
  v_mission_types TEXT[];
  v_result JSONB := '{"status": "success", "updated_missions": []}';
BEGIN
  -- Validate input data
  IF p_user_id IS NULL OR p_progress_data IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Invalid input parameters');
  END IF;

  -- Extract mission types safely
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(p_progress_data->'types')
  ) INTO v_mission_types;
  
  -- Process relevant missions in a single query
  FOR v_mission IN
    SELECT 
      mt.mission_id,
      mt.mission_type,
      (mt.mission_requirement)::JSONB as v_requirement,
      mpt.mission_progress_id,
      COALESCE((mpt.mission_progress_value->>'count')::INT, 0) as current_progress,
      COALESCE(mpt.mission_progress_completed, FALSE) as is_completed
    FROM mission_table mt
    LEFT JOIN mission_progress_table mpt 
      ON mpt.users_id = p_user_id 
      AND mpt.mission_id = mt.mission_id
    WHERE mt.mission_is_active = TRUE
      AND jsonb_typeof(mt.mission_requirement) = 'object'
      AND (mt.mission_requirement->>'count')::INT > 0
      AND mt.mission_type = ANY(v_mission_types)
      AND (mpt.mission_progress_id IS NULL OR NOT mpt.mission_progress_completed)
  LOOP

    -- Skip if already completed
    CONTINUE WHEN v_mission.is_completed;
    
    v_requirement := v_mission.v_requirement;

    -- Skip if requirements not met for quiz_category
    IF v_mission.mission_type = 'MissionType.quiz_category' THEN
      IF (v_requirement->>'category_id') IS NULL OR (p_progress_data->>'category_id') IS NULL THEN
        CONTINUE;
      ELSIF (v_requirement->>'category_id')::UUID <> (p_progress_data->>'category_id')::UUID THEN
        CONTINUE;
      END IF;
      -- More mission-specific validations can be added here
    END IF;

    -- Calculate new progress
    v_required_count := (v_requirement->>'count')::INT;
    v_current_progress := v_mission.current_progress + 1;
    v_is_completed := v_current_progress >= v_required_count;
    
    -- Insert or update progress
    IF v_mission.mission_progress_id IS NULL THEN
      INSERT INTO mission_progress_table(
        users_id, mission_id, mission_progress_value,
        mission_progress_completed
      )
      VALUES (
        p_user_id, v_mission.mission_id, jsonb_build_object('count', v_current_progress),
        v_is_completed
      )
      RETURNING mission_progress_id INTO v_progress_id;
    ELSE
      UPDATE mission_progress_table
      SET 
        mission_progress_value = jsonb_build_object('count', v_current_progress),
        mission_progress_completed = v_is_completed,
        mission_progress_updated_at = NOW()
      WHERE mission_progress_id = v_mission.mission_progress_id;
    END IF;

    -- Record updated mission
    v_result := jsonb_set(
      v_result,
      '{updated_missions}',
      (v_result->'updated_missions') || jsonb_build_object(
        'mission_id', v_mission.mission_id,
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
      'updated_missions', v_result->'updated_missions'
    );
END;
$function$

