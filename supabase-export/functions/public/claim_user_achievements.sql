-- schema:   public
-- function: claim_user_achievements(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_achievements_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.claim_user_achievements(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_achievements_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "reward_claim_details": null, "achievements_count_details": null, "error": null,"called": "1118"}';
    reward_id UUID;
    progress_rewarded BOOLEAN;
    progress_completed BOOLEAN;
    progress_id UUID;
    reward_data JSONB;
    count_details JSONB;
    achievements_exists BOOLEAN;
BEGIN
    -- Validate required parameters
    IF p_user_id IS NULL OR p_achievements_id IS NULL THEN
        result := jsonb_set(result, '{status}', '"AchievementReward.invalid_parameters"', false);
        RETURN result;
    END IF;

    -- Check if mission exists
    SELECT EXISTS(SELECT 1 FROM achievements_table WHERE achievements_id = p_achievements_id) INTO achievements_exists;
    IF NOT achievements_exists THEN
        result := jsonb_set(result, '{status}', '"AchievementReward.achievement_not_found"', false);
        RETURN result;
    END IF;

    -- Check if user already has progress for this achievements
    SELECT at.reward_id, apt.achievements_progress_id ,COALESCE(apt.achievements_progress_rewarded,FALSE),COALESCE(apt.achievements_progress_completed,FALSE) INTO reward_id, progress_id, progress_rewarded, progress_completed
    FROM achievements_table at
    LEFT JOIN achievements_progress_table apt ON 
        apt.achievements_id = at.achievements_id AND 
        apt.users_id = p_user_id
    WHERE at.achievements_id = p_achievements_id;

    IF progress_rewarded = TRUE THEN
        SELECT * INTO count_details FROM public.get_user_achievements_count(p_user_id,p_country,p_locale,p_gender,p_age);

        IF (count_details->>'achievements_data')::JSONB IS NOT NULL THEN
            result := jsonb_set(result, '{achievements_count_details}', (count_details->>'achievements_data')::JSONB, false);
        END IF;
        
        result := jsonb_set(result, '{status}', '"AchievementReward.duplicate"', false);
        RETURN result;
    END IF;
    
    -- If no progress exists and achievements is valid, claim reward
    IF reward_id IS NULL OR progress_completed = FALSE THEN
        result := jsonb_set(result, '{status}', '"AchievementReward.no_reward"', false);
        RETURN result;
    END IF;

    SELECT * INTO reward_data FROM reward_user(
        p_user_id, p_locale, p_country, p_gender, p_age,'ACHIEVE', reward_id,
        'ACHIEVEMENT'
    );

    -- Process reward result
    IF (reward_data->>'status')::TEXT = 'RewardStatus.success' AND (reward_data->'redeem_code'->>'redeem_code_id')::UUID IS NOT NULL  THEN 

        UPDATE achievements_progress_table 
        SET achievements_progress_rewarded = TRUE, 
        achievements_progress_updated_at = NOW(),
        redeem_code_id = (reward_data->'redeem_code'->>'redeem_code_id')::UUID
        WHERE achievements_progress_id = progress_id;

        result := jsonb_set(result, '{reward_claim_details}', jsonb_build_object(
            'reward_claim_redeem_code', (reward_data->>'redeem_code')::JSONB,
            'reward_claim_amount', (reward_data->>'value')::NUMERIC
        ));

        SELECT * INTO count_details FROM public.get_user_achievements_count(p_user_id,p_country,p_locale,p_gender,p_age);

        IF (count_details->>'achievements_data')::JSONB IS NOT NULL THEN
            result := jsonb_set(result, '{achievements_count_details}', (count_details->>'achievements_data')::JSONB, false);
        END IF;

        result := jsonb_set(result, '{status}', '"AchievementReward.success"', false);
    ELSE 
        result := jsonb_set(result, '{status}', '"AchievementReward.failed"', false);
        result := jsonb_set(result, '{error}', reward_data->'error', false);
    END IF;

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"AchievementReward.error"', false);
        RETURN result;
END;
$function$

