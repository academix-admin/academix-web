-- schema:   public
-- function: generate_transaction_external_ref()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.generate_transaction_external_ref()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_code TEXT;
BEGIN
    -- Generate the next value from the sequence
    new_code := lpad(nextval('external_transaction_ref_seq')::TEXT, 16, '0');

    -- Prefix with 'ADC' and return
    RETURN concat('REF', new_code);
END;
$function$

