-- schema: public
-- function: ingest_ip_geo() -> int. pg_cron worker (every minute): folds completed net._http_response
-- rows into ip_geo_cache (status ok/failed). Scheduled as job ip_geo_ingest.
CREATE OR REPLACE FUNCTION public.ingest_ip_geo()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE r record; v_json json; n int := 0;
BEGIN
  FOR r IN
    SELECT c.ip, resp.status_code, resp.content
      FROM public.ip_geo_cache c
      JOIN net._http_response resp ON resp.id = c.request_id
     WHERE c.status = 'pending' AND c.request_id IS NOT NULL
  LOOP
    BEGIN
      IF r.status_code = 200 AND r.content IS NOT NULL
         AND (r.content::json ->> 'status') = 'success' THEN
        v_json := r.content::json;
        UPDATE public.ip_geo_cache
           SET country_code = lower(nullif(v_json ->> 'countryCode','')),
               state_code   = lower(nullif(v_json ->> 'region','')),
               status = 'ok', resolved_at = now(), request_id = NULL
         WHERE ip = r.ip;
      ELSE
        UPDATE public.ip_geo_cache
           SET status = 'failed', resolved_at = now(), request_id = NULL
         WHERE ip = r.ip;
      END IF;
      n := n + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.ip_geo_cache SET status = 'failed', resolved_at = now(), request_id = NULL WHERE ip = r.ip;
    END;
  END LOOP;
  RETURN n;
END;
$function$;
