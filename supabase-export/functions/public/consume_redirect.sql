-- schema:   public
-- function: consume_redirect(p_redirect_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.consume_redirect(p_redirect_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE 
  redirectTo TEXT;
  redirectId TEXT;
  redirectQuery TEXT; -- ?col=red&req=ios  || lan=en&col=blue&req=android
  userId UUID;
  used BOOLEAN;
  expiresAt TEXT;
  recordExists BOOLEAN;
  finalUrl TEXT;
BEGIN

  SELECT rct.users_id, rct.redirect_link_id, rct.redirect_consume_query, rct.redirect_consume_used, rct.redirect_consume_expires_at, TRUE
  INTO userId, redirectId, redirectQuery, used, expiresAt, recordExists
  FROM redirect_consume_table rct
  WHERE rct.redirect_consume_id = p_redirect_id
  FOR UPDATE; -- to lock

  IF recordExists IS NULL OR recordExists = FALSE THEN 
     RETURN jsonb_build_object(
        'status', 'Redirect.error',
        'error', 'No record',
        'userId', null,
        'redirectTo', null
     );  
  END IF;

  -- Check if already used OR expired
  IF used = TRUE OR (expiresAt IS NOT NULL AND NOW()::TEXT > expiresAt) THEN 
     RETURN jsonb_build_object(
        'status', 'Redirect.reject',
        'error', CASE 
                  WHEN used = TRUE THEN 'Already used'
                  ELSE 'Expired'
                END,
        'userId', null,
        'redirectTo', null
     );  
  END IF;  

  UPDATE redirect_consume_table SET redirect_consume_used = TRUE WHERE redirect_consume_id = p_redirect_id;

  SELECT rlt.redirect_link_value INTO redirectTo
  FROM redirect_link_table rlt
  WHERE rlt.redirect_link_id = redirectId;

  IF redirectTo IS NULL THEN 
     RETURN jsonb_build_object(
        'status', 'Redirect.invalid',
        'error', 'Link does not exist',
        'userId', null,
        'redirectTo', null
     );  
  END IF;

  -- Build final redirect URL
  IF redirectQuery IS NOT NULL AND redirectQuery <> '' THEN
      -- Check if redirectTo already has '?'
      IF redirectTo LIKE '%?%' THEN
          finalUrl := redirectTo || '&' || redirectQuery;
      ELSE
          finalUrl := redirectTo || '?' || redirectQuery;
      END IF;
  ELSE
      finalUrl := redirectTo;
  END IF;

  RETURN jsonb_build_object(
        'status', 'Redirect.accept',
        'error', 'null',
        'userId', userId,
        'redirectTo', finalUrl
  );                 
END;
$function$

