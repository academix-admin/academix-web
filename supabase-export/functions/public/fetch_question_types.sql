-- schema:   public
-- function: fetch_question_types(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_question_types(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
        RETURN QUERY SELECT 
        jsonb_build_object(
            'question_type_id', qt.question_type_id,
            'question_type_identity',(SELECT translation FROM translate(qt.question_type_identity,p_locale)),
            'question_type_local_identity', qt.question_type_local_identity,
            'question_type_created_at', qt.question_type_created_at
        )
        FROM question_type_table qt 
        WHERE qt.question_type_available = TRUE;

END;
$function$

