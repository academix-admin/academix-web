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
    

  -- [idor-guard] spoof-proof identity: a JWT caller's p_user_id is forced to their own id;
  -- service-role callers (auth.uid() null) keep the passed id. No signature change (non-breaking).
  IF auth.uid() IS NOT NULL THEN p_user_id := auth.uid(); END IF;
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
