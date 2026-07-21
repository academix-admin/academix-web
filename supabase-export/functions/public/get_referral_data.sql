-- schema:   public
-- function: get_referral_data(p_username text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_referral_data(p_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE 
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
       'users_id', ut.users_id,
       'users_names', ut.users_names,
       'users_username', ut.users_username
    ) INTO result FROM users_table ut
    WHERE ut.users_username = p_username;
    
    RETURN result;
END;
$function$

