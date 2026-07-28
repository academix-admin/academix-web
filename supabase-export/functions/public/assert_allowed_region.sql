-- schema: public
-- function: assert_allowed_region(p_ip inet DEFAULT NULL) — optional explicit IP (auth.sessions trigger via NEW.ip); else x-forwarded-for header. Returns Region.blocked | NULL.
CREATE OR REPLACE FUNCTION public.assert_allowed_region(p_ip inet DEFAULT NULL::inet)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_xff text;
  v_ip  inet;
BEGIN
  IF p_ip IS NOT NULL THEN
    v_ip := p_ip;
  ELSE
    v_xff := current_setting('request.headers', true)::json ->> 'x-forwarded-for';
    IF v_xff IS NULL OR v_xff = '' THEN RETURN NULL; END IF;
    BEGIN
      v_ip := split_part(v_xff, ',', 1)::inet;
    EXCEPTION WHEN others THEN RETURN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM public.geo_blocklist b WHERE v_ip <<= b.cidr_range) THEN
    RETURN 'Region.blocked';
  END IF;
  RETURN NULL;
END;
$function$;
