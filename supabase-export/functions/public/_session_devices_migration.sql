-- =====================================================================================
-- Session device registry + device-aware new-session security signal.
-- Read-only mirror of the deployed objects (grouped like _session_gate_migration.sql).
--
-- SECRETS: the notifier Lambda secret lives in Supabase Vault under the name
-- 'notify_new_session_secret' and is read via public.notify_secret(). No secret value appears
-- in this file. Seed it once (out of band), e.g.:
--     select vault.create_secret('<lambda-secret>', 'notify_new_session_secret', 'notifier Lambda');
--
--   * session_devices          — durable per-session device record (device-trust foundation).
--   * notify_secret()          — locked-down Vault accessor (execute revoked from everyone;
--                                only the SECURITY DEFINER callers below read it).
--   * register_session_device  — client hook (app + web) after login. On a NEW session it emits
--                                one enriched, session-keyed event to the notifier Lambda
--                                (device_name, platform, ip, user_agent, is_known_device).
--   * notify_new_session       — always-fires trigger; sends session_id so the Lambda can
--                                correlate the two signals into one email per session.
--   * get_my_sessions          — returns device_name + platform (additive).
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.session_devices (
  session_id  uuid PRIMARY KEY REFERENCES auth.sessions(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  device_name text,
  platform    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  alerted_at  timestamptz              -- claimed by send_login_alert to dedup the one email/session
);
ALTER TABLE public.session_devices ADD COLUMN IF NOT EXISTS alerted_at timestamptz;
ALTER TABLE public.session_devices ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS session_devices_user_id_idx ON public.session_devices(user_id);

-- Locked-down Vault accessor for the notifier secret.
CREATE OR REPLACE FUNCTION public.notify_secret()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'vault','public'
AS $fn$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_new_session_secret' LIMIT 1;
$fn$;
REVOKE ALL ON FUNCTION public.notify_secret() FROM public;

CREATE OR REPLACE FUNCTION public.register_session_device(p_device_name text, p_platform text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'auth','public','extensions','net'
AS $fn$
DECLARE
  v_sid    uuid := nullif(current_setting('request.jwt.claims', true)::json ->> 'session_id','')::uuid;
  v_uid    uuid := auth.uid();
  v_name   text := nullif(btrim(p_device_name),'');
  v_plat   text := nullif(btrim(p_platform),'');
  v_new    boolean;
  v_known  boolean;
  v_ip     text;
  v_ua     text;
  v_created timestamptz;
BEGIN
  IF v_sid IS NULL OR v_uid IS NULL THEN RETURN; END IF;

  INSERT INTO public.session_devices(session_id, user_id, device_name, platform, created_at, updated_at)
    VALUES (v_sid, v_uid, v_name, v_plat, now(), now())
  ON CONFLICT (session_id) DO UPDATE
    SET device_name = COALESCE(EXCLUDED.device_name, public.session_devices.device_name),
        platform    = COALESCE(EXCLUDED.platform,    public.session_devices.platform),
        updated_at  = now()
  RETURNING (xmax = 0) INTO v_new;

  IF v_new THEN
    SELECT EXISTS(
      SELECT 1 FROM public.session_devices d
      WHERE d.user_id = v_uid
        AND d.session_id <> v_sid
        AND d.device_name IS NOT DISTINCT FROM v_name
        AND d.platform    IS NOT DISTINCT FROM v_plat
    ) INTO v_known;

    SELECT host(s.ip)::text, s.user_agent, s.created_at
      INTO v_ip, v_ua, v_created
      FROM auth.sessions s WHERE s.id = v_sid;

    PERFORM net.http_post(
      url := 'https://alvrcmblmuxsthzodxwsif6vju0koxgu.lambda-url.eu-north-1.on.aws/',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object(
        'secret',        public.notify_secret(),
        'event',         'session_device',
        'user_id',       v_uid,
        'session_id',    v_sid,
        'ip',            v_ip,
        'user_agent',    v_ua,
        'created_at',    v_created,
        'device_name',   v_name,
        'platform',      v_plat,
        'is_known_device', v_known
      )
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$fn$;
REVOKE ALL ON FUNCTION public.register_session_device(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.register_session_device(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_new_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions','net'
AS $fn$
begin
  perform net.http_post(
    url := 'https://alvrcmblmuxsthzodxwsif6vju0koxgu.lambda-url.eu-north-1.on.aws/',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object(
      'secret',     public.notify_secret(),
      'event',      'new_session',
      'session_id', NEW.id,
      'user_id',    NEW.user_id,
      'ip',         host(NEW.ip),
      'user_agent', NEW.user_agent,
      'created_at', NEW.created_at
    )
  );
  return NEW;
exception when others then
  return NEW;
end;
$fn$;

DROP FUNCTION IF EXISTS public.get_my_sessions();
CREATE OR REPLACE FUNCTION public.get_my_sessions()
RETURNS TABLE(id uuid, user_agent text, ip text, created_at timestamptz, refreshed_at timestamptz,
             is_current boolean, device_name text, platform text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'auth','public'
AS $fn$
  select s.id, s.user_agent, host(s.ip)::text as ip, s.created_at,
         coalesce(s.refreshed_at::timestamptz, s.updated_at) as refreshed_at,
         (s.id::text = (auth.jwt() ->> 'session_id')) as is_current,
         sd.device_name, sd.platform
  from auth.sessions s
  left join public.session_devices sd on sd.session_id = s.id
  where s.user_id = auth.uid()
  order by (s.id::text = (auth.jwt() ->> 'session_id')) desc,
           coalesce(s.refreshed_at::timestamptz, s.updated_at) desc;
$fn$;
GRANT EXECUTE ON FUNCTION public.get_my_sessions() TO authenticated;
