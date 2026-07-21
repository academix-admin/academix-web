-- schema:   public
-- function: check_phone_exist(p_phone text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.check_phone_exist(p_phone text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    result INTEGER;
BEGIN
    SELECT 1 INTO result FROM users_table WHERE users_phone = p_phone AND users_login_type = 'UserLoginType.phone';
    
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$function$

