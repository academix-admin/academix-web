-- schema:   public
-- function: fetch_quiz_modes(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_topic_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_quiz_modes(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_topic_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN

  -- [idor-guard] spoof-proof identity: a JWT caller's p_user_id is forced to their own id;
  -- service-role callers (auth.uid() null) keep the passed id. No signature change (non-breaking).
  IF auth.uid() IS NOT NULL THEN p_user_id := auth.uid(); END IF;
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
