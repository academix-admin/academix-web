-- schema:   public
-- function: handle_referral_payment(p_user_id uuid, p_amount numeric, p_type text, p_status text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.handle_referral_payment(p_user_id uuid, p_amount numeric, p_type text, p_status text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
AS $function$
DECLARE
    username        TEXT;
    referred_status TEXT;
    referred_id     UUID;
    expires         TIMESTAMPTZ;
    referral_bonus  NUMERIC := 300;
BEGIN
    IF p_type <> 'TransactionType.top_up' THEN
        RAISE NOTICE 'handle_referral_payment: skipping type %', p_type;
        RETURN NULL;
    END IF;

    IF p_status <> 'TransactionStatus.success' THEN
        RAISE NOTICE 'handle_referral_payment: skipping status %', p_status;
        RETURN NULL;
    END IF;

    SELECT ut.users_referred_id, ut.users_referred_status, ut.users_username
    INTO   referred_id, referred_status, username
    FROM   users_table ut
    WHERE  ut.users_id = p_user_id;

    IF referred_id IS NULL OR username IS NULL THEN
        RAISE NOTICE 'handle_referral_payment: user % has no referral', p_user_id;
        RETURN NULL;
    END IF;

    IF referred_status NOT IN ('Referral.active') THEN
        RAISE NOTICE 'handle_referral_payment: status % does not qualify', referred_status;
        RETURN NULL;
    END IF;

    IF p_amount < 1000 THEN
        UPDATE users_table
        SET users_referred_status = 'Referral.failed'
        WHERE users_id = p_user_id;

        RAISE NOTICE 'handle_referral_payment: amount % below minimum threshold of 1000', p_amount;
        RETURN NULL;
    END IF;

    expires := NOW() + INTERVAL '24 hours';

    INSERT INTO redeem_code_table (
        redeem_code_value,
        redeem_code_amount,
        redeem_code_description,
        redeem_code_expires,
        redeem_code_limit,
        users_id,
        redeem_code_source        
    ) VALUES (
        upper(username),
        referral_bonus,
        'REFERRAL BONUS',
        expires,
        1,
        referred_id,
        'REFERRAL'
    );

    UPDATE users_table
    SET users_referred_status = 'Referral.completed'
    WHERE users_id = p_user_id;

    RETURN expires;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'handle_referral_payment error for user %: %', p_user_id, SQLERRM;
        RETURN NULL;
END;
$function$

