BEGIN;

-- ── Replace the 334k static GeoIP table with a self-populating, TTL'd resolution CACHE ──────────
-- The sign-in trigger fires an async ip-api lookup (pg_net) on a cache miss; pg_cron ingests the
-- response. Table only ever holds IPs your real users hit → tiny, always fresh, auto-managed.
DROP TABLE IF EXISTS public.ip_geo;

CREATE TABLE IF NOT EXISTS public.ip_geo_cache (
  ip           inet PRIMARY KEY,
  country_code text,                 -- iso2 lower (NULL until resolved/failed)
  state_code   text,                 -- region code lower
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ok','failed')),
  request_id   bigint,               -- pg_net request id awaiting ingestion
  resolved_at  timestamptz,          -- when country/state were set (drives the TTL)
  requested_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ip_geo_cache_pending ON public.ip_geo_cache (status) WHERE status = 'pending';
REVOKE ALL ON public.ip_geo_cache FROM anon, authenticated;

-- resolve_ip_geo: same (country_code,state_code) interface region_block_status/gate_check already use.
-- Returns a hit only when fresh + ok; a miss (uncached/stale/failed) → NULL → callers fall back
-- (sign-in gate → registration country; fail-open).
CREATE OR REPLACE FUNCTION public.resolve_ip_geo(p_ip inet)
 RETURNS TABLE(country_code text, state_code text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.country_code, c.state_code
    FROM public.ip_geo_cache c
   WHERE c.ip = p_ip
     AND c.status = 'ok'
     AND c.resolved_at > now() - interval '30 days'   -- TTL: re-resolve monthly
   LIMIT 1;
$function$;

-- request_ip_geo: dedup + fire an async ip-api lookup for an uncached/stale IP. Fire-and-forget
-- (pg_net queues it); never blocks or breaks the caller. Skips private/reserved IPv4.
CREATE OR REPLACE FUNCTION public.request_ip_geo(p_ip inet)
 RETURNS void
 LANGUAGE plpgsql
 VOLATILE
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

-- ingest_ip_geo: pg_cron worker — fold completed pg_net responses into the cache. Runs every minute.
CREATE OR REPLACE FUNCTION public.ingest_ip_geo()
 RETURNS integer
 LANGUAGE plpgsql
 VOLATILE
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

-- Sign-in trigger: fire the async resolve for this IP (warms the cache for next time), then gate on
-- whatever is currently cached (miss → gate_check falls back to registration country, fail-open).
CREATE OR REPLACE FUNCTION public.gate_new_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_status text;
BEGIN
  BEGIN
    PERFORM public.request_ip_geo(NEW.ip);   -- lazy GeoIP: resolve this IP asynchronously
    SELECT status INTO v_status
      FROM public.gate_check('Features.sign_in', 'en', NEW.user_id, NULL, NEW.ip);
  EXCEPTION WHEN OTHERS THEN
    v_status := NULL;  -- fail-open
  END;

  IF v_status IS NOT NULL THEN
    RAISE EXCEPTION 'AX_SIGNIN_GATE:%', v_status USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;

-- ── pg_cron: ingest responses every minute + prune long-unused cache entries weekly ─────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$ BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('ip_geo_ingest','ip_geo_cleanup');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('ip_geo_ingest',  '* * * * *', $$SELECT public.ingest_ip_geo()$$);
SELECT cron.schedule('ip_geo_cleanup', '0 3 * * 0', $$DELETE FROM public.ip_geo_cache WHERE requested_at < now() - interval '90 days'$$);

NOTIFY pgrst, 'reload schema';
