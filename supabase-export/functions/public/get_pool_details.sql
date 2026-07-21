-- schema:   public
-- function: get_pool_details(p_user_id uuid, p_topic_id uuid, p_locale text, p_country text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_pool_details(p_user_id uuid, p_topic_id uuid, p_locale text, p_country text, p_gender text, p_age text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB;
BEGIN
        SELECT jsonb_build_object(
            'pools_id', pt.pools_id,
            'pools_locale', pt.pools_locale,
            'pools_status', pt.pools_status,
            'pools_starting_at', pt.pools_starting_at,
            'pools_duration', pt.pools_duration,
            'pools_job',pt.pools_job,
            'pools_visible',pt.pools_visible,
            'pools_auth',pt.pools_auth,
            'pools_code', pt.pools_code,
            'sort_created_id', pt.sort_created_id,
            'sort_updated_id', pt.sort_updated_id,
            'pools_job_end_at',pt.pools_job_end_at,
            'challenge_details', jsonb_build_object(
                'challenge_id', ct.challenge_id, 
                'challenge_identity',(SELECT translation FROM translate(ct.challenge_identity,p_locale)),
                'challenge_development_charge',ct.challenge_development_charge,
                'challenge_price',ct.challenge_price,
                'challenge_top_share',ct.challenge_top_share,
                'challenge_mid_share',ct.challenge_mid_share,
                'challenge_bot_share',ct.challenge_bot_share,
                'challenge_min_participants', ct.challenge_min_participants,
                'challenge_max_participants', ct.challenge_max_participants,
                'challenge_question_count', ct.challenge_question_count,
                'game_mode_details', jsonb_build_object(
                  'game_mode_id', gmt.game_mode_id ,
                  'game_mode_identity', (SELECT translation FROM translate(gmt.game_mode_identity,p_locale)),
                  'game_mode_checker', gmt.game_mode_checker
                )                
            ),
            'pools_members_count', (
                SELECT count(pm.users_id)
                FROM pools_members_table pm
                WHERE pm.pools_id = pt.pools_id
            ),
            'question_tracker_count', (
                    SELECT count(qt.question_tracker_id) 
                    FROM question_tracker_table qt
                    LEFT JOIN pools_question_table pq
                    ON pq.pools_question_id = qt.pools_question_id
                    WHERE pq.pools_id = pt.pools_id AND qt.users_id = p_user_id
            )
        ) INTO result
        FROM pools_table pt
        LEFT JOIN challenge_table ct ON pt.challenge_id = ct.challenge_id
        LEFT JOIN game_mode_table gmt ON gmt.game_mode_id = ct.game_mode_id
        WHERE  
        (pt.pools_status = 'Pools.active' OR pt.pools_status = 'Pools.open' OR pt.pools_status = 'Pools.sealed') 
        AND pt.topics_id  = p_topic_id
        AND (p_user_id = ANY (
          SELECT pm.users_id 
          FROM pools_members_table pm 
          WHERE  pm.pools_id = pt.pools_id
    )); 

    RETURN COALESCE(result, NULL);
END;
$function$

