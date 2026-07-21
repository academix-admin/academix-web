-- schema:   public
-- function: fetch_user_top_up_wallet(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid, p_country_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_user_top_up_wallet(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid, p_country_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    wallet JSONB;
BEGIN

    IF p_country_id IS NULL THEN 
       RETURN NULL;
    END IF; 

    -- Get a single wallet (assuming you want just one)
    SELECT jsonb_build_object(
      'payment_wallet_id', pwt.payment_wallet_id,
      'payment_wallet_currency', pwt.payment_wallet_currency,
      'payment_wallet_identity', pwt.payment_wallet_identity,
      'payment_wallet_buy_rate_type',pwt.payment_wallet_buy_rate_type,
      'payment_wallet_buy_fee', pwt.payment_wallet_buy_fee,
      'payment_wallet_buy_fee_flat', pwt.payment_wallet_buy_fee_flat,
      'payment_wallet_buy_rate', pwt.payment_wallet_buy_rate,
      'payment_wallet_buy_min', pwt.payment_wallet_buy_min,
      'payment_wallet_image',pwt.payment_wallet_image,
      'sort_created_id', pwt.sort_created_id
    ) INTO wallet
    FROM payment_wallet_table pwt 
    WHERE pwt.payment_wallet_buy_active = TRUE
    AND pwt.payment_wallet_buy_min > 0
    AND pwt.payment_wallet_buy_rate > 0
    AND pwt.country_id = p_country_id
    LIMIT 1;  -- Add LIMIT if you only want one row
    
    RETURN wallet;
END;
$function$

