-- schema:   public
-- function: fetch_withdraw_wallets(p_limit_by integer, p_after_wallets jsonb, p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_withdraw_wallets(p_limit_by integer, p_after_wallets jsonb, p_country text DEFAULT NULL::text, p_locale text DEFAULT NULL::text, p_gender text DEFAULT NULL::text, p_age text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sortID TEXT;
BEGIN
    -- Extract sort ID from the passed JSONB object
    sortID := (p_after_wallets->>'sort_id')::TEXT;

    RETURN QUERY 
    SELECT jsonb_build_object(
      'payment_wallet_id', pwt.payment_wallet_id,
      'payment_wallet_currency', pwt.payment_wallet_currency,
      'payment_wallet_identity', pwt.payment_wallet_identity,
      'payment_wallet_sell_rate_type',pwt.payment_wallet_sell_rate_type,
      'payment_wallet_sell_fee', pwt.payment_wallet_sell_fee,
      'payment_wallet_sell_fee_flat', pwt.payment_wallet_sell_fee_flat,
      'payment_wallet_sell_rate', pwt.payment_wallet_sell_rate,
      'payment_wallet_image',pwt.payment_wallet_image,
      'payment_wallet_sell_min', pwt.payment_wallet_sell_min,
      'sort_created_id', pwt.sort_created_id
    )
    FROM payment_wallet_table pwt 
    WHERE pwt.payment_wallet_buy_active = TRUE
    AND pwt.payment_wallet_sell_min > 0
    AND pwt.payment_wallet_sell_rate > 0
    AND (sortID IS NULL 
        OR (pwt.sort_created_id)::TEXT > sortID::TEXT)
    ORDER BY (pwt.sort_created_id)::TEXT ASC
    LIMIT p_limit_by;

END;
$function$

