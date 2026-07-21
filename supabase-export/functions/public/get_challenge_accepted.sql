-- schema:   public
-- function: get_challenge_accepted(p_owner_id uuid, p_topic_id uuid, p_challenge_id uuid, p_country text, p_locale text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_challenge_accepted(p_owner_id uuid, p_topic_id uuid, p_challenge_id uuid, p_country text, p_locale text, p_gender text, p_age text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE 
    requiredQuestion INT;
    allQuestions INT;
    completedQuestions INT;
BEGIN
    -- Get required question count from the challenge table
    SELECT ct.challenge_question_count 
    INTO requiredQuestion 
    FROM challenge_table ct 
    WHERE ct.challenge_id = p_challenge_id;

    -- Get all available questions count
    SELECT COUNT(questions_id)
    INTO allQuestions
    FROM get_accepted_questions(p_owner_id, p_topic_id, p_locale, p_country, p_age, p_gender );

    RETURN allQuestions >= requiredQuestion;
END;
$function$

