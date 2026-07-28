-- schema: public
-- function: request_ip_geo(inet) -> void. On a cache miss/stale, fires an async ip-api lookup via
-- pg_net (net.http_get) + upserts a pending row. Dedupes in-flight/failed. Never breaks sign-in.
CREATE OR REPLACE FUNCTION public.request_ip_geo(p_ip inet)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'extensions'
AS $function$
DECLARE
  v_status text; v_resolved timestamptz; v_requested timestamptz; v_id bigint;
BEGIN
  IF p_ip IS NULL OR family(p_ip) <> 4 THEN RETURN; END IF;
  IF p_ip <<= '10.0.0.0/8' OR p_ip <<= '172.16.0.0/12' OR p_ip <<= '192.168.0.0/16'
     OR p_ip <<= '127.0.0.0/8' OR p_ip <<= '169.254.0.0/16' OR p_ip <<= '100.64.0.0/10' THEN RETURN; END IF;

  SELECT status, resolved_at, requested_at INTO v_status, v_resolved, v_requested
    FROM public.ip_geo_cache WHERE ip = p_ip;
  IF FOUND THEN
    IF v_status = 'ok'      AND v_resolved  > now() - interval '30 days'  THEN RETURN; END IF; -- fresh
    IF v_status = 'pending' AND v_requested > now() - interval '2 minutes' THEN RETURN; END IF; -- in-flight
    IF v_status = 'failed'  AND v_requested > now() - interval '1 hour'    THEN RETURN; END IF; -- cooldown
  END IF;

  v_id := net.http_get('http://ip-api.com/json/' || host(p_ip) || '?fields=status,countryCode,region');
  INSERT INTO public.ip_geo_cache (ip, status, requested_at, request_id)
       VALUES (p_ip, 'pending', now(), v_id)
  ON CONFLICT (ip) DO UPDATE SET status = 'pending', requested_at = now(), request_id = EXCLUDED.request_id;
EXCEPTION WHEN OTHERS THEN
  RETURN;  -- geo bookkeeping must never break sign-in
END;
$function$;
