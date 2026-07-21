-- schema:   public
-- function: check_pool_capacity()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.check_pool_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    max_cap INT;
    current_cap INT;
BEGIN
    -- Get max capacity for this pool's challenge
    SELECT ct.challenge_max_participants INTO max_cap
    FROM pools_table pt
    JOIN challenge_table ct ON pt.challenge_id = ct.challenge_id
    WHERE pt.pools_id = NEW.pools_id;
    
    -- Count current members
    SELECT COUNT(*) INTO current_cap
    FROM pools_members_table
    WHERE pools_id = NEW.pools_id;
    
    -- Check if adding this member would exceed capacity
    IF current_cap >= max_cap THEN
        RAISE EXCEPTION 'Pool % has reached maximum capacity of % participants', 
            NEW.pools_id, max_cap
        USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$function$

