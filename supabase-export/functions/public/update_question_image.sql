-- schema:   public
-- function: update_question_image(p_locale text, p_question_id uuid, p_image_path text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.update_question_image(p_locale text, p_question_id uuid, p_image_path text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    update_count INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    UPDATE questions_table
    SET questions_image = p_image_path
    WHERE questions_id = p_question_id
      AND (SELECT translation::uuid FROM translate(questions_created_by, p_locale)) = v_user_id;

    GET DIAGNOSTICS update_count = ROW_COUNT;
    RETURN update_count > 0;
END;
$function$

