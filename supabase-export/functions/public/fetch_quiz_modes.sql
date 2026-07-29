-- schema:   public
-- function: fetch_quiz_modes
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_quiz_modes(p_locale text, p_topic_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Modes that have >=1 available challenge for this user. fetch_quiz_challenges is
    -- server-authoritative (derives identity + demographics via gate_check internally), so its
    -- current 3-arg signature (topic_id, p_locale, p_game_mode_id) is all that's threaded here.
    -- (Was calling a stale 7-arg signature removed during the H2/I3 identity migration -> 42883.)
    RETURN QUERY
    SELECT jsonb_build_object(
            'game_mode_id', gmt.game_mode_id,
            'game_mode_identity', (SELECT translation FROM translate(gmt.game_mode_identity, p_locale)),
            'game_mode_checker', gmt.game_mode_checker
    )
    FROM game_mode_table gmt
    WHERE (
        (SELECT COUNT(*) FROM public.fetch_quiz_challenges(p_topic_id, p_locale, gmt.game_mode_id)) > 0
        OR p_topic_id IS NULL
    );
END;
$function$

