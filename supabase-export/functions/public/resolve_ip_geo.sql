-- schema: public
-- function: resolve_ip_geo(inet) -> (country_code,state_code). Reads the lazy ip_geo_cache
-- (fresh ok entries only; 30-day TTL). Miss -> NULL -> caller falls back (sign-in gate: registration).
CREATE OR REPLACE FUNCTION public.resolve_ip_geo(p_ip inet)
 RETURNS TABLE(country_code text, state_code text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.country_code, c.state_code
    FROM public.ip_geo_cache c
   WHERE c.ip = p_ip
     AND c.status = 'ok'
     AND c.resolved_at > now() - interval '30 days'   -- TTL: re-resolve monthly
   LIMIT 1;
$function$;
