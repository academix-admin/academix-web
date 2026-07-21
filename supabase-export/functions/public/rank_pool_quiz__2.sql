-- schema:   public
-- function: rank_pool_quiz()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.rank_pool_quiz()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  results JSONB[]; 
  result JSONB;
  rank INT;
  member UUID;
BEGIN
    
    IF NEW.pools_graded_at IS NULL OR NEW.pools_ranked_at IS NOT NULL THEN 
      RETURN NULL;
    END IF;
     
    -- Get all results ordered by: size DESC, time ASC, sort_created_id ASC
    SELECT array_agg(
      jsonb_build_object(
        'users_id', pmt.users_id,
        'size', pmt.pools_completed_question_tracker_size,
        'time', pmt.pools_completed_question_tracker_time,
        'sort', pmt.sort_created_id
      ) ORDER BY 
        pmt.pools_completed_question_tracker_size DESC,  -- Highest score first
        pmt.pools_completed_question_tracker_time ASC,   -- Fastest time for same score
        pmt.sort_created_id ASC                         -- Earliest join for same score+time
    ) INTO results
    FROM pools_members_table pmt
    WHERE pmt.pools_id = NEW.pools_id;

    -- Assign ranks based on array position (already ordered)
    FOR i IN 1..array_length(results, 1) LOOP
      result := results[i];
      member := (result->>'users_id')::UUID;
      rank := i;  -- Rank = array index (1-based)
   
      UPDATE pools_members_table 
      SET pools_members_rank = rank
      WHERE pools_id = NEW.pools_id AND users_id = member;
    END LOOP;
    
    -- Mark pool as ranked
    UPDATE pools_table 
    SET pools_ranked_at = NOW()
    WHERE pools_id = NEW.pools_id;

    RETURN NULL;
END;
$function$

