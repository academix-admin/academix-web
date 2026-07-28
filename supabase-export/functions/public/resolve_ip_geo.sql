-- schema: public
-- function: resolve_ip_geo(inet) -> (country_code,state_code). IPv4 range lookup over ip_geo (GeoIP).
CREATE OR REPLACE FUNCTION public.resolve_ip_geo(p_ip inet)
 RETURNS TABLE(country_code text, state_code text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT g.country_code, g.state_code
    FROM public.ip_geo g
   WHERE family(p_ip) = 4
     AND (p_ip - '0.0.0.0'::inet) BETWEEN g.ip_start AND g.ip_end
   ORDER BY g.ip_start DESC
   LIMIT 1;
$function$;
