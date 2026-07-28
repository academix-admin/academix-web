-- schema:   public
-- function: fetch_quiz_modes(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_topic_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_quiz_modes(p_locale text, p_topic_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    p_user_id uuid;
    p_country text;
    p_gender text;
    p_age text;
BEGIN

  -- [gate] identity + demographics via public.gate_check
  SELECT users_id, country, gender, age INTO p_user_id, p_country, p_gender, p_age
    FROM public.gate_check(NULL, p_locale);
    RETURN QUERY 
    SELECT jsonb_build_object(
            'game_mode_id', gmt.game_mode_id,
            'game_mode_identity', (SELECT translation FROM translate(gmt.game_mode_identity, p_locale)),
            'game_mode_checker', gmt.game_mode_checker
    )
    FROM game_mode_table gmt
    WHERE (
        (SELECT COUNT(*) 
         FROM public.fetch_quiz_challenges(
             p_user_id,
             p_topic_id,
             p_locale,
             p_country,
             p_gender,
             p_age,
             gmt.game_mode_id
         )) > 0
        OR p_topic_id IS NULL
    );
END;
$function$
