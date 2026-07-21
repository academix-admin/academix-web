-- schema:   public
-- function: fetch_question_time(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_question_time(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
        RETURN QUERY SELECT 
        jsonb_build_object(
            'question_time_id', qt.question_time_id,
            'question_time_value', qt.question_time_value
        )
        FROM question_time_table qt
        ORDER BY qt.question_time_value;

END;
$function$

