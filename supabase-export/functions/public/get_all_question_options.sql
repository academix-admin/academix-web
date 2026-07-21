-- schema:   public
-- function: get_all_question_options(p_user_id uuid, p_question_id uuid, p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_all_question_options(p_user_id uuid, p_question_id uuid, p_locale text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
        SELECT
            jsonb_build_object(
                'options_id', ot.options_id,
                'option_image',ot.options_image,
                'option_min',ot.options_min,
                'option_max',ot.options_max,
                'option_unit',ot.options_unit,
                'options_created_at', ot.options_created_at,
                'options_identity', (SELECT translation FROM translate(ot.options_identity,p_locale)),
                'options_is_correct', ot.options_is_correct
            )
        FROM options_table ot
        WHERE ot.questions_id = p_question_id;

END;
$function$

