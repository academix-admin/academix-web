-- schema:   public
-- function: submit_or_update_user_profile(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_method_id uuid, p_profile_data jsonb, p_profile_type text, p_status boolean)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.submit_or_update_user_profile(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_method_id uuid, p_profile_data jsonb, p_profile_type text, p_status boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "payment_profile_details": null, "error": null}'; -- Initialize result JSONB
    profile_details JSONB;
    method_checker TEXT;
    p_profile_id UUID;
    p_buy_active BOOLEAN;
    p_sell_active BOOLEAN;
    old_sell_active BOOLEAN;
    old_buy_active BOOLEAN;
    profile_phone TEXT;
BEGIN

    -- Check if both sell and buy are inactive
    IF p_profile_type <> 'PaymentType.buy' AND p_profile_type <> 'PaymentType.sell' THEN
        result := jsonb_set(result, '{status}', '"PaymentProfile.no_type"', false);
        RETURN result;
    END IF;

    -- Check if the payment method exists
    SELECT pmt.payment_method_checker INTO method_checker
    FROM payment_method_table pmt
    WHERE payment_method_id = p_method_id;

    IF method_checker IS NULL THEN
        result := jsonb_set(result, '{status}', '"PaymentProfile.no_method"', false);
        RETURN result;
    END IF;

    -- Extract profile data based on the payment method
    CASE method_checker
        WHEN 'PaymentMethod.mobile_money' THEN
            
            IF p_profile_data IS NOT NULL THEN
                profile_phone := (p_profile_data->>'profile_phone')::TEXT;
            END IF;
        -- More cases for other payment methods 
        ELSE
            -- Handle unsupported payment methods
            result := jsonb_set(result, '{status}', '"PaymentProfile.unsupported_method"', false);
            RETURN result;
    END CASE;

    -- Get profile data based on the payment method extraction
    CASE method_checker
        WHEN 'PaymentMethod.mobile_money' THEN
            
            IF profile_phone IS NOT NULL THEN
                    SELECT ppt.payment_profile_id, ppt.payment_profile_buy_active,ppt.payment_profile_sell_active
                    INTO p_profile_id, old_buy_active, old_sell_active
                    FROM payment_profile_table ppt
                    WHERE ppt.payment_profile_phone = profile_phone
                    AND ppt.users_id = p_user_id;
            END IF;
        -- More cases for other payment methods 
        ELSE
            -- Handle unsupported payment methods
            result := jsonb_set(result, '{status}', '"PaymentProfile.unsupported_method"', false);
            RETURN result;
    END CASE;

    


    -- Insert or update the profile
    IF p_profile_id IS NULL THEN
        
        IF p_profile_type = 'PaymentType.buy' THEN 
            p_buy_active := p_status;
            p_sell_active := FALSE;
        ELSE 
            p_buy_active := FALSE;
            p_sell_active := p_status;
        END IF;

        -- Insert the profile data into the payment profile table
        INSERT INTO payment_profile_table (
            payment_profile_buy_active,
            payment_profile_sell_active,
            payment_method_id,
            users_id,
            payment_profile_phone
        ) VALUES (
            p_buy_active,
            p_sell_active,
            p_method_id,
            p_user_id,
            profile_phone
        ) RETURNING to_jsonb(payment_profile_table.*) INTO profile_details;
    ELSE

        IF p_profile_type = 'PaymentType.buy' THEN 
            p_buy_active := p_status;
            p_sell_active := old_sell_active;
        ELSE 
            p_buy_active := old_buy_active;
            p_sell_active := p_status;
        END IF;

        -- Update the profile if it exists and either buy or sell was previously inactive
        IF old_buy_active <> p_buy_active OR old_sell_active <> p_sell_active THEN

            UPDATE payment_profile_table
            SET payment_profile_buy_active = p_buy_active,
                payment_profile_sell_active = p_sell_active
            WHERE payment_profile_id = p_profile_id
            RETURNING to_jsonb(payment_profile_table.*) INTO profile_details;
        ELSE
            result := jsonb_set(result, '{status}', '"PaymentProfile.exists"', false);
            RETURN result;
        END IF;
    END IF;

    -- Check if the insertion or update was successful
    IF profile_details IS NULL THEN
        result := jsonb_set(result, '{status}', '"PaymentProfile.failed"', false);
    ELSE
        result := jsonb_set(result, '{status}', '"PaymentProfile.success"', false);
        result := jsonb_set(result, '{payment_profile_details}', profile_details, false);
    END IF;

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Catch unexpected errors and update the result
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"PaymentProfile.error"', false);
        RETURN result;
END;
$function$

