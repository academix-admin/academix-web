-- schema:   public
-- function: get_quiz_available(p_owner_id uuid, topic_id uuid, p_locale text, p_country text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_quiz_available(p_owner_id uuid, topic_id uuid, p_locale text, p_country text, p_gender text, p_age text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    min_question_count integer;
    accepted_count     integer;
BEGIN
    IF p_owner_id IS NULL OR topic_id IS NULL THEN
        RAISE EXCEPTION 'Invalid input parameters: p_owner_id and topic_id cannot be NULL';
    END IF;
 
    -- Fast-path: user already has an active/open challenge for this topic
    IF EXISTS (
        SELECT 1
        FROM pools_table p
        JOIN pools_members_table pmt
            ON pmt.pools_id = p.pools_id
        WHERE p.topics_id  = topic_id
          AND p.pools_status IN ('Pools.active', 'Pools.open')
          AND pmt.users_id = p_owner_id
    ) THEN
        RETURN false;
    END IF;
 
    -- Single aggregate instead of a row-by-row loop + array + ANY()
    SELECT MIN(challenge_question_count)
    INTO min_question_count
    FROM challenge_table;
 
    -- If no challenges exist at all, no quiz is available
    IF min_question_count IS NULL THEN
        RETURN false;
    END IF;
 
    -- Count accepted questions using the optimized helper
    accepted_count := count_accepted_questions(
        p_owner_id, topic_id, p_locale, p_country, p_age, p_gender
    );
 
    RETURN accepted_count >= min_question_count;
END;
$function$

