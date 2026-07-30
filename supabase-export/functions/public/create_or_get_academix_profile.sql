-- schema:   public
-- function: create_or_get_academix_profile(p_target_user uuid, p_locale text)
-- Single overload used by BOTH internal SQL callers (positional uuid: charge_user_quiz_pool,
-- complete_pool_quiz, pay_pool_quiz, reward_user) AND the app clients (web + Flutter) which call
-- rpc('create_or_get_academix_profile', { p_locale }). p_locale is accepted for client compat and
-- currently unused. SECURITY INVOKER: RLS on the payment tables permits SELECT (public) + INSERT
-- (authenticated), and p_user_id is pinned to auth.uid() for non-service callers.
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.create_or_get_academix_profile(p_target_user uuid DEFAULT NULL::uuid, p_locale text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    p_user_id uuid := CASE WHEN (coalesce(auth.jwt()->>'role','') = 'service_role' OR session_user IN ('service_role','supabase_auth_admin','postgres')) AND p_target_user IS NOT NULL THEN p_target_user ELSE auth.uid() END;
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
      AND ppt.users_id = p_user_id;

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
            INSERT INTO payment_profile_table (users_id, payment_method_id)
            VALUES (p_user_id, method_id)
            RETURNING jsonb_build_object(
                'payment_wallet_id', wallet_id,
                'payment_method_id', method_id,
                'payment_profile_id', payment_profile_id
            ) INTO profile_details;
        ELSE
            -- Handle case where no matching payment method or wallet is found
            RAISE EXCEPTION 'No matching payment method or wallet found for method_checker: %', 'PaymentMethod.academix_coin';
        END IF;
    END IF;

    -- Return the profile details
    RETURN profile_details;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_or_get_academix_profile(uuid, text) TO anon, authenticated, service_role;
