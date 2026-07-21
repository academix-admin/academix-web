-- schema:   public
-- function: generate_pool_code()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.generate_pool_code()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_code TEXT;
    attempts INT := 0;
    max_attempts INT := 1000; -- Safeguard to prevent infinite loops
BEGIN
    WHILE TRUE LOOP
        -- Generate a random 9-character alphanumeric code
        new_code := (
            SELECT string_agg(
                substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', (random() * 36)::int + 1, 1), ''
            ) 
            FROM generate_series(1, 9)
        );

        -- Check if the code exists, return if unique
        IF NOT EXISTS (SELECT 1 FROM pools_table WHERE pools_code = new_code) AND length(new_code) = 9 THEN
            RETURN new_code;
        END IF;

        -- Increment attempts and check if max attempts reached
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Unable to generate a unique pool code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$function$

