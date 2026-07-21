-- schema:   public
-- function: claim_user_mission(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_mission_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.claim_user_mission(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_mission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "reward_claim_details": null, "mission_count_details": null, "error": null,"called": "918"}';
    reward_id UUID;
    progress_rewarded BOOLEAN;
    progress_completed BOOLEAN;
    progress_id UUID;
    reward_data JSONB;
    count_details JSONB;
    mission_exists BOOLEAN;
BEGIN
    -- Validate required parameters
    IF p_user_id IS NULL OR p_mission_id IS NULL THEN
        result := jsonb_set(result, '{status}', '"MissionReward.invalid_parameters"', false);
        RETURN result;
    END IF;

    -- Check if mission exists
    SELECT EXISTS(SELECT 1 FROM mission_table WHERE mission_id = p_mission_id) INTO mission_exists;
    IF NOT mission_exists THEN
        result := jsonb_set(result, '{status}', '"MissionReward.mission_not_found"', false);
        RETURN result;
    END IF;

    -- Check if user already has progress for this mission
    SELECT mt.reward_id, mpt.mission_progress_id ,COALESCE(mpt.mission_progress_rewarded,FALSE), COALESCE(mpt.mission_progress_completed, FALSE) INTO reward_id, progress_id, progress_rewarded, progress_completed
    FROM mission_table mt
    LEFT JOIN mission_progress_table mpt ON 
        mpt.mission_id = mt.mission_id AND 
        mpt.users_id = p_user_id
    WHERE mt.mission_id = p_mission_id;

    IF progress_rewarded = TRUE THEN
        SELECT * INTO count_details FROM public.get_user_missions_count(p_user_id,p_country,p_locale,p_gender,p_age);

        IF (count_details->>'mission_data')::JSONB IS NOT NULL THEN
            result := jsonb_set(result, '{mission_count_details}', (count_details->>'mission_data')::JSONB, false);
        END IF;
        
        result := jsonb_set(result, '{status}', '"MissionReward.duplicate"', false);
        RETURN result;
    END IF;
    
    -- If no progress exists and mission is valid, claim reward
    IF reward_id IS NULL OR progress_completed = FALSE THEN
        result := jsonb_set(result, '{status}', '"MissionReward.no_reward"', false);
        RETURN result;
    END IF;

    SELECT * INTO reward_data FROM reward_user(
        p_user_id, p_locale, p_country, p_gender, p_age,'MISSION', reward_id, 'MISSION'
    );

    -- Process reward result
    IF (reward_data->>'status')::TEXT = 'RewardStatus.success' AND (reward_data->'redeem_code'->>'redeem_code_id')::UUID IS NOT NULL THEN 

        UPDATE mission_progress_table 
        SET mission_progress_rewarded = TRUE, 
        mission_progress_updated_at = NOW(),
        redeem_code_id = (reward_data->'redeem_code'->>'redeem_code_id')::UUID
        WHERE mission_progress_id = progress_id;

        result := jsonb_set(result, '{reward_claim_details}', jsonb_build_object(
            'reward_claim_redeem_code', (reward_data->>'redeem_code')::JSONB,
            'reward_claim_amount', (reward_data->>'value')::NUMERIC
        ));

        SELECT * INTO count_details FROM public.get_user_missions_count(p_user_id,p_country,p_locale,p_gender,p_age);

        IF (count_details->>'mission_data')::JSONB IS NOT NULL THEN
            result := jsonb_set(result, '{mission_count_details}', (count_details->>'mission_data')::JSONB, false);
        END IF;

        result := jsonb_set(result, '{status}', '"MissionReward.success"', false);
    ELSE 
        result := jsonb_set(result, '{status}', '"MissionReward.failed"', false);
        result := jsonb_set(result, '{error}', reward_data->'error', false);
    END IF;

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"MissionReward.error"', false);
        RETURN result;
END;
$function$

