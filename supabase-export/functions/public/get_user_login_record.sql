-- schema:   public
-- function: get_user_login_record(p_login_type text, p_login_check text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_user_login_record(p_login_type text, p_login_check text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
      'users_email', ut.users_email,
      'users_names', ut.users_names,
      'users_dob', ut.users_dob,
      'users_sex', ut.users_sex,
      'users_login_type', ut.users_login_type,
      'users_phone', ut.users_phone
    )
    INTO result 
    FROM users_table ut
    WHERE 
      (p_login_type = 'UserLoginType.email' AND ut.users_email = p_login_check)
      OR (p_login_type = 'UserLoginType.phone' AND ut.users_phone = p_login_check)
      OR (p_login_type = 'UserLoginType.username' AND ut.users_username = p_login_check);
    RETURN result;
END;
$function$

