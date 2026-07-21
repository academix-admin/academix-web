-- schema:   public
-- function: fetch_quiz_challenges(p_owner_id uuid, topic_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_game_mode_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_quiz_challenges(p_owner_id uuid, topic_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_game_mode_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE 
    allQuestions INT;
    completedQuestions INT;
    availableQuestions INT;
BEGIN
    -- Get all available questions count
    SELECT COUNT(questions_id)
    INTO allQuestions
    FROM get_accepted_questions(p_owner_id, topic_id ,p_locale, p_country, p_age, p_gender);

    -- Return matching challenges
    RETURN QUERY 
    SELECT jsonb_build_object(
        'challenge_id', ct.challenge_id, 
        'challenge_identity', (SELECT translation FROM translate(ct.challenge_identity,p_locale)),
        'challenge_development_charge', ct.challenge_development_charge,
        'challenge_price', ct.challenge_price,
        'challenge_top_share', ct.challenge_top_share,
        'challenge_mid_share', ct.challenge_mid_share,
        'challenge_bot_share', ct.challenge_bot_share,
        'challenge_waiting_time', ct.challenge_waiting_time,
        'challenge_min_participants', ct.challenge_min_participants,
        'challenge_max_participants', ct.challenge_max_participants,
        'challenge_question_count', ct.challenge_question_count,
        'game_mode_details', jsonb_build_object(
            'game_mode_id', gmt.game_mode_id ,
            'game_mode_identity', (SELECT translation FROM translate(gmt.game_mode_identity,p_locale)),
            'game_mode_checker', gmt.game_mode_checker
        )
    )
    FROM challenge_table ct
    LEFT JOIN game_mode_table gmt ON gmt.game_mode_id = ct.game_mode_id
    WHERE 
        allQuestions >= ct.challenge_question_count 
        AND ct.challenge_visible = TRUE
        AND ct.users_id IS NULL
        AND ((p_game_mode_id IS NOT NULL AND gmt.game_mode_id = p_game_mode_id) OR p_game_mode_id IS NULL)
    ORDER BY ct.challenge_rank;
END;
$function$

