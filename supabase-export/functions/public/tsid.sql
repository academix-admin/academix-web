-- schema:   public
-- function: tsid(input_time timestamp with time zone)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.tsid(input_time timestamp with time zone DEFAULT clock_timestamp())
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'extensions', 'public'
AS $function$
DECLARE
    ts_micros bigint;
    rand_bytes bytea;
    chars text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    time_portion text;
    random_portion text := '';
    val numeric;
    remainder integer;
BEGIN
    -- Timestamp handling (unchanged)
    BEGIN
        ts_micros := (extract(epoch from input_time) * 1000000)::bigint;
        time_portion := lpad(to_hex(ts_micros), 16, '0');
    EXCEPTION WHEN OTHERS THEN
        time_portion := lpad(to_hex(extract(epoch from clock_timestamp()) * 1000000), 16, '0');
    END;
    time_portion := substr(time_portion, 1, 16); -- Force 16 chars

    -- Random portion with fallback to random()
    BEGIN
        -- Try pgcrypto's gen_random_bytes first
        rand_bytes := extensions.gen_random_bytes(8);
    EXCEPTION WHEN OTHERS THEN
        -- Fallback: Generate 8 bytes using PostgreSQL's random()
        rand_bytes := 
            (floor(random() * 256)::int::bit(8)) ||
            (floor(random() * 256)::int::bit(8)) ||
            (floor(random() * 256)::int::bit(8)) ||
            (floor(random() * 256)::int::bit(8)) ||
            (floor(random() * 256)::int::bit(8)) ||
            (floor(random() * 256)::int::bit(8)) ||
            (floor(random() * 256)::int::bit(8)) ||
            (floor(random() * 256)::int::bit(8));
    END;

    -- Base62 conversion (unchanged)
    val := ('x' || encode(rand_bytes, 'hex'))::bit(64)::bigint::numeric;
    FOR i IN 1..11 LOOP
        remainder := (val % 62)::integer;
        random_portion := substr(chars, remainder + 1, 1) || random_portion;
        val := floor(val / 62);
    END LOOP;

    -- Final output (guaranteed 27 chars)
    RETURN 
        rpad(substr(time_portion, 1, 16), 16, '0') || 
        rpad(substr(random_portion, 1, 11), 11, '0');
END;
$function$

