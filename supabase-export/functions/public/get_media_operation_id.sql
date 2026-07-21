-- schema:   public
-- function: get_media_operation_id(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_type text, p_path text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_media_operation_id(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_type text, p_path text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    id UUID;
BEGIN
    
    INSERT INTO media_operation_table (
      users_id,
      media_operation_type,
      media_operation_path
    )VALUES (
      p_user_id,
      p_type,
      p_path
    ) RETURNING media_operation_id INTO id;
    
    RETURN id;

END;
$function$

