-- schema:   public
-- function: check_username_exist(p_username text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.check_username_exist(p_username text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    result INTEGER;
    formatted_username TEXT;
BEGIN
    -- Add @ if it doesn't exist at the start
    IF LEFT(p_username, 1) <> '@' THEN
        formatted_username := CONCAT('@', p_username);
    ELSE
        formatted_username := p_username;
    END IF;
    
    -- Check if the formatted username exists
    SELECT 1 INTO result 
    FROM users_table 
    WHERE users_username = formatted_username;
    
    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$function$

