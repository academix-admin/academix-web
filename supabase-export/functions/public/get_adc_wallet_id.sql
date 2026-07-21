-- schema:   public
-- function: get_adc_wallet_id()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_adc_wallet_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
    SELECT payment_wallet_id
    FROM payment_wallet_table
    WHERE payment_wallet_currency = 'ADC'
    LIMIT 1;
$function$

