-- schema:   public
-- function: get_pools_members_count(p_user_id uuid, p_pools_id uuid, p_topics_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_pools_members_count(p_user_id uuid, p_pools_id uuid, p_topics_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_count int;
BEGIN
    SELECT COUNT(users_id) INTO v_count 
    FROM pools_members_table 
    WHERE pools_id = p_pools_id;
    
    RETURN v_count;
END;
$function$

