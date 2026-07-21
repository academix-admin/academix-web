-- schema:   public
-- function: get_method_country_code(p_method_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_method_country_code(p_method_id uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
   code TEXT;
BEGIN
    
    IF p_method_id IS NULL THEN 
       RETURN NULL;
    END IF;

    SELECT ct.country_two_iso_code INTO code
    FROM payment_method_table pmt 
    LEFT JOIN payment_wallet_table pwt ON pwt.payment_wallet_id = pmt.payment_wallet_id
    LEFT JOIN country_table ct ON ct.country_id = pwt.country_id
    WHERE pmt.payment_method_id = p_method_id
    AND pwt.country_id IS NOT NULL
    LIMIT 1;

    RETURN code;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Payment Update Error: %', SQLERRM;
        RETURN NULL;
END;
$function$

