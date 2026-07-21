-- schema:   public
-- function: get_partial_user_record(p_login_type text, p_login_check text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_partial_user_record(p_login_type text, p_login_check text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
      'users_id', ut.users_id,
      'users_dob', ut.users_dob,
      'users_sex', ut.users_sex
    )
    INTO result 
    FROM users_table ut
    WHERE 
      (p_login_type = 'UserLoginType.email' AND ut.users_email = p_login_check)
      OR (p_login_type = 'UserLoginType.phone' AND ut.users_phone = p_login_check);
    RETURN result;
END;
$function$

