-- schema:   public
-- function: update_option_image(p_locale text, p_option_id uuid, p_image_path text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.update_option_image(p_locale text, p_option_id uuid, p_image_path text DEFAULT NULL::text)
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

    UPDATE options_table AS o
    SET options_image = p_image_path
    WHERE o.options_id = p_option_id
      AND EXISTS (
          SELECT 1
          FROM questions_table q
          WHERE q.questions_id = o.questions_id
            AND (SELECT translation::uuid FROM translate(q.questions_created_by, p_locale)) = v_user_id
      );

    GET DIAGNOSTICS update_count = ROW_COUNT;
    RETURN update_count > 0;
END;
$function$

