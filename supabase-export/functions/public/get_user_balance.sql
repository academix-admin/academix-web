-- schema:   public
-- function: get_user_balance(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_user_balance(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE 
    result JSONB;
BEGIN
    -- Attempt to retrieve the user's balance information
    SELECT jsonb_build_object(
           'users_id', ubt.users_id,
           'users_balance_amount', ubt.users_balance_amount,
           'users_balance_updated_at', ubt.users_balance_updated_at
    ) INTO result 
    FROM personal.users_balance_table ubt
    WHERE ubt.users_id = p_user_id;

    RETURN result;
    
END;
$function$

