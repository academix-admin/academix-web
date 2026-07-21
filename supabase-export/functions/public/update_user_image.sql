-- schema:   public
-- function: update_user_image(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_operation_id uuid, p_image_path text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.update_user_image(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_operation_id uuid, p_image_path text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    old_image_path TEXT;
    update_count INTEGER;
BEGIN
    -- Validate required parameters
    IF p_user_id IS NULL OR p_operation_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get the old image path
    SELECT users_image INTO old_image_path
    FROM users_table 
    WHERE users_id = p_user_id;

    -- If the user doesn't exist, return false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Here you would add code to remove the old image from your storage bucket
    -- For example, if using AWS S3:
    -- IF old_image_path IS NOT NULL THEN 
    --    PERFORM aws_s3.delete_object('users-profile-bucket', old_image_path);
    -- END IF;

    -- Update the user's image path
    UPDATE users_table 
    SET users_image = p_image_path
    WHERE users_id = p_user_id;
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    
    -- Clean up the media operation record
    DELETE FROM media_operation_table 
    WHERE media_operation_id = p_operation_id;
    
    -- Return true if the update was successful
    RETURN update_count > 0;
END;
$function$

