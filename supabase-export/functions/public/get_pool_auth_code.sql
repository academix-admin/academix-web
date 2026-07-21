-- schema:   public
-- function: get_pool_auth_code(p_user_id uuid, p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_pool_auth_code(p_user_id uuid, p_pool_id uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    pool_auth TEXT;
    pool_auth_code TEXT;
BEGIN
    

    -- FETCH POOL DETAILS
    SELECT pt.pools_auth
    INTO pool_auth
    FROM pools_table pt
    WHERE pt.pools_id = p_pool_id ;

    -- If pool_auth is 'PoolAuth.public'
    IF pool_auth = 'PoolAuth.public' THEN

        -- Fetch existing auth code if it exists
        SELECT pat.pools_auth_code_value 
        INTO pool_auth_code
        FROM pools_auth_code_table pat
        WHERE pat.pools_id = p_pool_id;

    ELSE
        SELECT pat.pools_auth_code_value 
        INTO pool_auth_code
        FROM pools_auth_code_table pat
        WHERE pat.pools_id = p_pool_id AND pat.users_id = p_user_id;      
    END IF;

    -- Return the generated or fetched auth code
    RETURN pool_auth_code;
END;
$function$

