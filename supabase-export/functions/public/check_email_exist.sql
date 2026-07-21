-- schema:   public
-- function: check_email_exist(p_email text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.check_email_exist(p_email text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    result INTEGER;
BEGIN
    SELECT 1 INTO result FROM users_table WHERE users_email = p_email AND users_login_type = 'UserLoginType.email';
    
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

