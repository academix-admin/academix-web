-- schema:   public
-- function: update_category_image(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_category_id uuid, p_image_path text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.update_category_image(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_category_id uuid, p_image_path text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    old_image_path TEXT;
    update_count INTEGER;
BEGIN
    -- Validate required parameters
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

  
    -- Update the user's image path
    UPDATE topic_category_table 
    SET topic_category_image = p_image_path
    WHERE topic_category_id = p_category_id;
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    
    
    -- Return true if the update was successful
    RETURN update_count > 0;
END;
$function$

