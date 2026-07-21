-- schema:   public
-- function: get_option_evaluation(p_user_id uuid, p_question_id uuid, p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_option_evaluation(p_user_id uuid, p_question_id uuid, p_locale text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT jsonb_build_object(
        'options_id', ot.options_id,
        'options_image',ot.options_image,
        'options_created_at', ot.options_created_at,
        'options_is_correct', ot.options_is_correct,
        'decision_translation', ot.options_identity,
        'options_identity', (SELECT translation FROM translate(ot.options_identity, p_locale))
    )
    FROM options_table ot
    WHERE ot.questions_id = p_question_id;
END;
$function$

