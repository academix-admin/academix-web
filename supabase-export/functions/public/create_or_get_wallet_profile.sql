-- schema:   public
-- function: create_or_get_wallet_profile(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.create_or_get_wallet_profile(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    profile_details JSONB;
    wallet_id UUID;
    buy_rate numeric;
    sell_rate numeric;
    method_id UUID;
BEGIN

    -- Guard: return NULL if user does not exist
    IF NOT EXISTS (SELECT 1 FROM users_table WHERE users_id = p_user_id) THEN
        RETURN NULL;
    END IF;

    -- Check if a profile already exists for the user and payment method
    SELECT jsonb_build_object(
        'payment_wallet_id', pwt.payment_wallet_id,
        'payment_method_id', pmt.payment_method_id,
        'payment_profile_id', ppt.payment_profile_id
    ) INTO profile_details
    FROM payment_profile_table ppt
    LEFT JOIN payment_method_table pmt ON pmt.payment_method_id = ppt.payment_method_id
    LEFT JOIN payment_wallet_table pwt ON pwt.payment_wallet_id = pmt.payment_wallet_id
    WHERE pmt.payment_method_checker = 'PaymentMethod.academix_coin'
      AND ppt.payment_profile_receiver = TRUE
      AND ppt.users_id IS NULL;

    -- If no profile exists, create a new one
    IF profile_details IS NULL THEN
        -- Fetch wallet and method IDs for the given payment method checker
        SELECT pwt.payment_wallet_id,pwt.payment_wallet_buy_rate,pwt.payment_wallet_sell_rate, pmt.payment_method_id
        INTO wallet_id,buy_rate, sell_rate, method_id
        FROM payment_method_table pmt
        LEFT JOIN payment_wallet_table pwt ON pwt.payment_wallet_id = pmt.payment_wallet_id
        WHERE pmt.payment_method_checker = 'PaymentMethod.academix_coin';

        -- If wallet and method IDs are found, create a new profile
        IF wallet_id IS NOT NULL AND method_id IS NOT NULL THEN
            INSERT INTO payment_profile_table (users_id, payment_method_id,payment_profile_receiver)
            VALUES (NULL, method_id,TRUE)
            RETURNING jsonb_build_object(
                'payment_wallet_id', wallet_id,
                'payment_method_id', method_id,
                'payment_profile_id', payment_profile_id
            ) INTO profile_details;
        ELSE
            -- Handle case where no matching payment method or wallet is found
            RAISE EXCEPTION 'No matching payment method or wallet found for method_checker: %', p_method_checker;
        END IF;
    END IF;

    -- Return the profile details
    RETURN profile_details;
END;
$function$

