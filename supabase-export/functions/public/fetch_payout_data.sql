-- schema:   public
-- function: fetch_payout_data(p_locale text, p_challenge_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_payout_data(p_locale text, p_challenge_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN QUERY 
    SELECT jsonb_build_object(
        'game_mode_id', gmt.game_mode_id ,
            'game_mode_identity', (SELECT translation FROM translate(gmt.game_mode_identity, p_locale)),
            'game_mode_checker', gmt.game_mode_checker,
            'challenge_options', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'challenge_identity', (SELECT translation FROM translate(ct.challenge_identity, p_locale)),
                        'challenge_question_count', ct.challenge_question_count,
                        'challenge_price', ct.challenge_price,
                        'challenge_development_charge', ct.challenge_development_charge,
                        'challenge_creator_share', ct.challenge_creator_share,
                        'challenge_reviewer_share', ct.challenge_reviewer_share,
                        'challenge_role_share', ct.challenge_role_share,
                        'challenge_top_share', ct.challenge_top_share,
                        'challenge_mid_share', ct.challenge_mid_share,
                        'challenge_bot_share', ct.challenge_bot_share,
                        'challenge_min_participants', ct.challenge_min_participants,
                        'challenge_max_participants', ct.challenge_max_participants
                    )
                    ORDER BY ct.challenge_rank
                )
                FROM challenge_table ct
                WHERE ct.game_mode_id = gmt.game_mode_id
                    AND ct.challenge_visible = TRUE
                    AND (p_challenge_id IS NULL OR ct.challenge_id = p_challenge_id)
            )
        
    )
    FROM game_mode_table gmt
    WHERE EXISTS (
        SELECT 1 FROM challenge_table ct 
        WHERE ct.game_mode_id = gmt.game_mode_id 
            AND ct.challenge_visible = TRUE
            AND (p_challenge_id IS NULL OR ct.challenge_id = p_challenge_id)
    )
    ORDER BY gmt.game_mode_id;
END;
$function$

