-- schema:   public
-- function: assert_allowed_region() RETURNS text
-- Geoblock helper (Workstream: server-authoritative identity + geoblock).
-- Returns 'Region.blocked' when the server-observed client IP is in public.geo_blocklist, else NULL.
-- Never raises. Table lives in ../../schema/public.sql. Synced with deployed project iewqfmkngcgayxbbnpiz.

CREATE OR REPLACE FUNCTION public.assert_allowed_region()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_xff text;
  v_ip  inet;
BEGIN
  -- Server-side client IP as recorded by Supabase's edge (not settable by the JS caller's body).
  -- Returns 'Region.blocked' when the IP falls in a blocklisted CIDR, else NULL. Never raises, so
  -- callers can fold it into their own jsonb response format. Empty geo_blocklist => always NULL.
  v_xff := current_setting('request.headers', true)::json ->> 'x-forwarded-for';
  IF v_xff IS NULL OR v_xff = '' THEN RETURN NULL; END IF;
  BEGIN
    v_ip := split_part(v_xff, ',', 1)::inet;
  EXCEPTION WHEN others THEN RETURN NULL; END;
  IF EXISTS (SELECT 1 FROM public.geo_blocklist b WHERE v_ip <<= b.cidr_range) THEN
    RETURN 'Region.blocked';
  END IF;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.assert_allowed_region() FROM public;
GRANT EXECUTE ON FUNCTION public.assert_allowed_region() TO anon, authenticated, service_role;
