-- schema:   public
-- function: tsdf(tsid text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.tsdf(tsid text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    hex_portion text;
    micros_epoch bigint;
BEGIN
    -- Validate input length (16 hex chars + 11 base62 chars = 27 total)
    IF length(tsid) != 27 THEN
        RAISE EXCEPTION 'Invalid TSID length: % (expected 27 characters)', tsid;
    END IF;

    -- Extract the first 16 characters (hexadecimal timestamp portion)
    hex_portion := substr(tsid, 1, 16);
    
    -- Convert hex to microseconds since epoch
    BEGIN
        micros_epoch := ('x' || hex_portion)::bit(64)::bigint;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid hexadecimal timestamp in TSID: %', hex_portion;
    END;

    -- Convert microseconds to timestamp
    RETURN to_timestamp(micros_epoch / 1000000.0);
END;
$function$

