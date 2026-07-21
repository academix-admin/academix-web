-- schema:   public
-- function: get_quiz_status_check(p_owner_id uuid, topic_id uuid, p_locale text, p_country text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_quiz_status_check(p_owner_id uuid, topic_id uuid, p_locale text, p_country text, p_gender text, p_age text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE 
    challenge uuid;
BEGIN
    -- Ensure input parameters are valid
    IF p_owner_id IS NULL OR topic_id IS NULL THEN
        RAISE EXCEPTION 'Invalid input parameters: p_owner_id and topic_id cannot be NULL';
    END IF;

    -- Retrieve the challenge_id from pools_table where it strictly meet
    SELECT  p.challenge_id 
    INTO  challenge
    FROM pools_table p
    WHERE 
    p.topics_id = topic_id
    AND (p_owner_id = ANY (
          SELECT pm.users_id 
          FROM pools_members_table pm 
          WHERE pm.pools_id = p.pools_id
    )) 
    AND p.pools_locale = p_locale
    AND (p.pools_status = 'Pools.active' OR p.pools_status = 'Pools.open')
    AND (p.pools_job IS NOT NULL AND p.pools_job <> 'PoolJob.cancelled' AND p.pools_job <> 'PoolJob.pool_ended')
    -- AND (p.pools_starting_at IS NULL 
    --  OR (p.pools_duration IS NOT NULL 
    --      AND p.pools_starting_at IS NOT NULL 
    --      AND NOW() < ((p.pools_starting_at)::TIMESTAMPTZ + (p.pools_duration * INTERVAL '1 second'))
    --     ))


    LIMIT 1;


    -- Handle cases where no challenge is found
    IF challenge IS NULL THEN
        RETURN FALSE; -- No matching challenge found
    END IF;

    RETURN TRUE;
    -- -- Check the retrieved challenge 
    -- RETURN (
    --         (SELECT * 
    --         FROM public.get_challenge_accepted(
    --             p_owner_id, 
    --             topic_id, 
    --             challenge, 
    --             p_country, 
    --             p_locale, 
    --             p_gender, 
    --             p_age
    --         )) = true
    --     );
END;
$function$

