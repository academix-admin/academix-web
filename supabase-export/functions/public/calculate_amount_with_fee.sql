-- schema:   public
-- function: calculate_amount_with_fee(original_amount numeric, fee_type text, fee_amount numeric, fee_flat numeric)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.calculate_amount_with_fee(original_amount numeric, fee_type text, fee_amount numeric, fee_flat numeric)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
    result NUMERIC;
BEGIN
    IF original_amount IS NULL OR fee_type IS NULL OR fee_amount IS NULL THEN
        RETURN NULL;
    END IF;
    
    IF fee_type = 'RateType.PERCENT' THEN
        IF fee_amount < 0 OR fee_amount > 100 THEN
            RETURN NULL;
        END IF;
        result := original_amount * (fee_amount / 100);

    ELSIF fee_type = 'RateType.FEE' THEN
        IF fee_amount < 0 THEN
            RETURN NULL;
        END IF;
        result := fee_amount;

    ELSIF fee_type = 'RateType.FUNCTION' THEN
        IF fee_amount < 0 THEN
            RETURN NULL;
        END IF;
        result := GREATEST(COALESCE(fee_flat, 0), (original_amount * fee_amount) / 100);

    ELSE
        RETURN NULL;
    END IF;
    
    RETURN result;
END;
$function$

