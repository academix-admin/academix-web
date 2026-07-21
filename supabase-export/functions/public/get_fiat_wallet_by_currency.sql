-- schema:   public
-- function: get_fiat_wallet_by_currency(p_currency text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_fiat_wallet_by_currency(p_currency text)
 RETURNS TABLE(wallet_id uuid, buy_rate numeric, sell_rate numeric, buy_fee numeric, sell_fee numeric, buy_fee_flat numeric, sell_fee_flat numeric, buy_rate_type text, sell_rate_type text, buy_min numeric, sell_min numeric, buy_active boolean, sell_active boolean, wallet_identity text)
 LANGUAGE sql
 STABLE
AS $function$
    SELECT
        payment_wallet_id,
        payment_wallet_buy_rate,    payment_wallet_sell_rate,
        payment_wallet_buy_fee,     payment_wallet_sell_fee,
        payment_wallet_buy_fee_flat,payment_wallet_sell_fee_flat,
        payment_wallet_buy_rate_type, payment_wallet_sell_rate_type,
        payment_wallet_buy_min,     payment_wallet_sell_min,
        payment_wallet_buy_active,  payment_wallet_sell_active,
        payment_wallet_identity
    FROM payment_wallet_table
    WHERE payment_wallet_currency = p_currency
      AND payment_wallet_currency <> 'ADC'
    LIMIT 1;
$function$

