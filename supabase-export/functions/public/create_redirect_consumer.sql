-- schema:   public
-- function: create_redirect_consumer(p_user_id uuid, p_redirect_to text, p_query text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.create_redirect_consumer(p_user_id uuid, p_redirect_to text, p_query text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE 
  redirectId UUID;
  redirectTo TEXT;
BEGIN
  SELECT rlt.redirect_link_value INTO redirectTo
  FROM redirect_link_table rlt
  WHERE rlt.redirect_link_id = 'redirect';

  IF redirectTo IS NULL THEN 
     RETURN jsonb_build_object(
        'status', 'Redirect.reject',
        'error', 'Unable to create redirect',
        'redirectTo', null
     );  
  END IF;

  INSERT INTO redirect_consume_table (users_id, redirect_link_id, redirect_consume_expires_at, redirect_consume_query) VALUES (p_user_id, p_redirect_to, (NOW() + INTERVAL '5 minutes')::TEXT, p_query)
  RETURNING redirect_consume_id INTO redirectId;

  if redirectId IS NULL THEN 
     RETURN jsonb_build_object(
        'status', 'Redirect.failed',
        'error', 'Error creating redirect',
        'redirectTo', null
     );  
  END IF;
  
  RETURN jsonb_build_object(
        'status', 'Redirect.success',
        'error', null,
        'redirectTo', redirectTo || '/' || redirectId
  );                 
END;
$function$

