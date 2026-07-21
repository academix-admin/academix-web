-- schema:   public
-- function: gamify_pool_quiz(p_pool_id uuid, jwt_token text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.gamify_pool_quiz(p_pool_id uuid, jwt_token text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  results JSONB[]; 
  result JSONB;
  member UUID;
  member_id UUID;
  member_rank INT;
  member_category TEXT;
  pool_data RECORD;
BEGIN

    SELECT * INTO pool_data FROM pools_table WHERE pools_id = p_pool_id FOR UPDATE;
    
    IF pool_data.pools_paid_at IS NULL OR pool_data.pools_gamified_at IS NOT NULL THEN 
      RETURN;
    END IF;
     
    -- Get all members 
    SELECT array_agg(
      jsonb_build_object(
        'users_id', pmt.users_id,
        'member_id',pmt.pools_members_id,
        'rank', pmt.pools_members_rank,
        'category',pmt.pools_members_category
      )                    
    ) INTO results
    FROM pools_members_table pmt
    WHERE pmt.pools_id = p_pool_id;


    -- Assign price based on rank
    FOR i IN 1..array_length(results, 1) LOOP
      result := results[i];
      member_id := (result->>'member_id')::UUID;
      member := (result->>'users_id')::UUID;
      member_rank := (result->>'rank')::INT;  
      member_category := (result->>'category')::TEXT;


      -- Send for missions
      -- update_user_mission_progress
      -- p_user_id uuid, p_progress_data jsonb[{"types": ["MissionType.first_quiz"]}]
      PERFORM async_rpc(
            'update_user_mission_progress',
             jsonb_build_object(
              'p_user_id', member,
              'p_progress_data', jsonb_build_object(
              'types', to_jsonb(array['MissionType.first_quiz'])
              )
            ),
            'https://iewqfmkngcgayxbbnpiz.supabase.co',
            jwt_token
      );


      -- Send for achievements
      PERFORM async_rpc(
            'update_user_achievements_progress',
             jsonb_build_object(
              'p_user_id', member,
              'p_progress_data', jsonb_build_object(
              'types', to_jsonb(array['AchievementType.first_top']),
              'rank_category', member_category
              )
            ),
            'https://iewqfmkngcgayxbbnpiz.supabase.co',
            jwt_token
      );


      -- Send for engagements
      PERFORM async_rpc(
            'update_user_engagement_progress',
             jsonb_build_object(
              'p_pool_member_id', member_id
            ),
            'https://iewqfmkngcgayxbbnpiz.supabase.co',
            jwt_token
      );
      
    END LOOP;

    -- Mark pool as gamified
    UPDATE pools_table 
    SET pools_gamified_at = clock_timestamp()
    WHERE pools_id = pool_data.pools_id;

    RETURN;
END;
$function$

