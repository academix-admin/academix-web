-- schema:   public
-- function: reward_user(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_title text, p_reward_id uuid, p_source text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.reward_user(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_title text, p_reward_id uuid, p_source text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "redeem_code": null, "value": null, "transaction_id": null, "error": null, "called": "718"}';
    reward_record RECORD;
    expire_time TIMESTAMPTZ;
    redeem_code JSONB;
    transaction_details JSONB;
    receiver_profile JSONB;
    sender_profile JSONB;
    response_status TEXT;
    transaction_id_text TEXT;
    paid_amount NUMERIC;
BEGIN
    -- Validate required parameters
    IF p_user_id IS NULL OR p_reward_id IS NULL THEN
        result := jsonb_set(result, '{status}', '"RewardStatus.invalid_parameters"', false);
        RETURN result;
    END IF;

    -- Step 1: Retrieve the reward
    SELECT rt.* INTO reward_record
    FROM reward_table rt
    WHERE rt.reward_id = p_reward_id;

    IF NOT FOUND THEN
        result := jsonb_set(result, '{status}', '"RewardStatus.not_found"', false);
        RETURN result;
    END IF;

    IF reward_record.reward_value <= 0 THEN 
        result := jsonb_set(result, '{status}', '"RewardStatus.in_active"', false);
        RETURN result;
    END IF;

    -- Set expiration if applicable
    IF COALESCE(reward_record.reward_expires_hour, 0) > 0 THEN 
        expire_time := NOW() + reward_record.reward_expires_hour * INTERVAL '1 hour';
    END IF;   

    -- Handle different reward types
    CASE reward_record.reward_type
        WHEN 'RewardType.redeem_code' THEN 
            SELECT create_reward_redeem_code(
                   p_user_id, 
                   reward_record.reward_value,
                   p_title,
                   expire_time,
                   p_source
                   ) INTO redeem_code;
                   
            IF redeem_code IS NOT NULL THEN 
                result := jsonb_set(result, '{value}', to_jsonb(reward_record.reward_value), false);
                result := jsonb_set(result, '{redeem_code}', redeem_code, false);
                result := jsonb_set(result, '{status}', '"RewardStatus.success"', false); 
            ELSE 
                result := jsonb_set(result, '{status}', '"RewardStatus.failed"', false);        
            END IF;

        WHEN 'RewardType.academix_coin' THEN
            -- Set payment amount
            paid_amount := ABS(reward_record.reward_value);
            
            -- Get receiver profile (user)
            SELECT * INTO receiver_profile FROM create_or_get_academix_profile(p_user_id, p_locale, p_country, p_gender, p_age);
            
            -- Get sender profile (academix)
            SELECT * INTO sender_profile FROM create_or_get_wallet_profile(p_user_id, p_locale, p_country, p_gender, p_age);
            
            IF sender_profile IS NOT NULL AND receiver_profile IS NOT NULL THEN
                -- Make payment
                SELECT * INTO transaction_details FROM make_payment(
                    p_user_id, 
                    (sender_profile->>'payment_profile_id')::UUID,
                    (receiver_profile->>'payment_profile_id')::UUID,
                    paid_amount,
                    'TransactionType.participation',
                    p_locale,
                    p_country,
                    p_gender,
                    p_age,
                    ''
                );
                
                -- Check transaction details
                IF transaction_details IS NOT NULL THEN
                    response_status := transaction_details->>'status';
                    transaction_id_text := transaction_details->'transaction_details'->>'transaction_id';
                    
                    IF response_status = 'Payment.success' AND transaction_id_text IS NOT NULL THEN  
                        result := jsonb_set(result, '{value}', to_jsonb(reward_record.reward_value), false);
                        result := jsonb_set(result, '{status}', '"RewardStatus.success"', false);
                        result := jsonb_set(result, '{transaction_id}', to_jsonb(transaction_id_text), false);
                    ELSE 
                        result := jsonb_set(result, '{status}', '"RewardStatus.failed"', false);
                    END IF;
                ELSE   
                    result := jsonb_set(result, '{status}', '"RewardStatus.failed"', false);
                END IF;
            ELSE
                result := jsonb_set(result, '{status}', '"RewardStatus.profile_error"', false);
            END IF;
            
        ELSE
            result := jsonb_set(result, '{status}', '"RewardStatus.unknown_type"', false);
    END CASE;

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"RewardStatus.error"', false);
        RETURN result;
END;
$function$

