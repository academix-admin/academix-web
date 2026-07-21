-- schema:   public
-- function: generate_transaction_internal_ref()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.generate_transaction_internal_ref()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_code TEXT;
BEGIN
    -- Generate the next value from the sequence
    new_code := lpad(nextval('internal_transaction_ref_seq')::TEXT, 13, '0');

    -- Prefix with 'ADC' and return
    RETURN concat('ADC', new_code);
END;
$function$

