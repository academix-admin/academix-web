-- schema:   public
-- function: hook_sign_in_gate(event jsonb) RETURNS jsonb
-- Supabase "Password Verification Attempt" Auth Hook. Enforces the Features.sign_in feature flag
-- server-side on password sign-in (the client checkFeatures() pre-check was removed as bypassable).
--
-- Reuses the EXISTING gating logic — the same features_table + public.decontrol query that
-- public.get_feature_status runs — but evaluated from the hook's event payload, because the hook
-- runs as `supabase_auth_admin` (no auth.uid(), and the live cf-ipcountry header is not present in
-- the GoTrue DB call). Identity comes from event->>'user_id'; gender/age + country are derived from
-- users_table exactly like public.gate_check does, using the user's REGISTRATION country.
--
-- FAIL-OPEN by design: a login gate must never lock users out on an error or on missing config.
-- Only an explicitly-configured Features.sign_in that is inactive / excludes the user's cohort rejects.
-- Contract: input {user_id, valid}; output {decision:'continue'} or {decision:'reject', message}.
-- Synced with deployed (project iewqfmkngcgayxbbnpiz).

CREATE OR REPLACE FUNCTION public.hook_sign_in_gate(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid     uuid;
  v_valid   boolean;
  v_gender  text;
  v_age     text;
  v_country text;
  v_active  boolean;
BEGIN
  v_uid   := (event ->> 'user_id')::uuid;
  v_valid := COALESCE((event ->> 'valid')::boolean, true);

  -- Only gate a SUCCESSFUL password verification. Let a wrong password fall through to GoTrue's
  -- normal invalid-credentials handling.
  IF NOT v_valid OR v_uid IS NULL THEN
    RETURN jsonb_build_object('decision', 'continue');
  END IF;

  -- Not configured => sign-in is open (fail-open). Never block when there is no Features.sign_in row.
  IF NOT EXISTS (SELECT 1 FROM public.features_table WHERE features_checker = 'Features.sign_in') THEN
    RETURN jsonb_build_object('decision', 'continue');
  END IF;

  -- Same derivation as public.gate_check: gender m/f, age in years, registration country iso2.
  SELECT CASE WHEN ut.users_sex = 'Gender.male' THEN 'm' ELSE 'f' END,
         floor(extract(epoch FROM (now() - ut.users_dob::timestamptz)) / 31557600.0)::int::text,
         (SELECT lower(ct.country_two_iso_code) FROM public.country_table ct WHERE ct.country_id = ut.country_id)
    INTO v_gender, v_age, v_country
  FROM public.users_table ut
  WHERE ut.users_id = v_uid;

  -- Fail-open on an unknown user or an incomplete profile: never lock a real user out of sign-in
  -- because their cohort couldn't be resolved. (A genuine gate is an admin explicitly disabling the
  -- feature for a well-formed cohort, handled below.)
  IF NOT FOUND OR v_country IS NULL OR v_age IS NULL THEN
    RETURN jsonb_build_object('decision', 'continue');
  END IF;

  -- Reuse the EXISTING feature-flag query (features_table + decontrol), identical to
  -- public.get_feature_status, evaluated for this user's cohort + registration country.
  SELECT ft.features_active INTO v_active
    FROM public.features_table ft
   WHERE ft.features_checker = 'Features.sign_in'
     AND (SELECT value FROM public.decontrol(ft.language_control, 'en',      'en')) = TRUE
     AND (SELECT value FROM public.decontrol(ft.country_control,  v_country, 'en')) = TRUE
     AND (SELECT value FROM public.decontrol(ft.gender_control,   v_gender,  'en')) = TRUE
     AND (SELECT value FROM public.decontrol(ft.age_control,      v_age,     'en')) = TRUE
   LIMIT 1;

  IF COALESCE(v_active, FALSE) = FALSE THEN
    RETURN jsonb_build_object(
      'decision', 'reject',
      'message',  'Sign-in is currently unavailable for your account.'
    );
  END IF;

  RETURN jsonb_build_object('decision', 'continue');

EXCEPTION WHEN OTHERS THEN
  -- Fail-open: a gate error must never lock a user out of sign-in.
  RETURN jsonb_build_object('decision', 'continue');
END;
$function$;

-- Auth hooks are invoked by the auth server as `supabase_auth_admin`.
REVOKE ALL ON FUNCTION public.hook_sign_in_gate(jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hook_sign_in_gate(jsonb) TO supabase_auth_admin;
