-- schema: public
-- function: gate_check(p_feature,p_locale,p_user_id,p_country_override,p_ip) — consolidated gate.
-- Region ALWAYS enforced; feature/cohort gate skipped for profile-less users (new OAuth/social
-- signup) so onboarding isn't blocked by null demographics / a missed IP-country lookup.

CREATE OR REPLACE FUNCTION public.gate_check(p_feature text DEFAULT NULL::text, p_locale text DEFAULT 'en'::text, p_user_id uuid DEFAULT NULL::uuid, p_country_override text DEFAULT NULL::text, p_ip inet DEFAULT NULL::inet)
 RETURNS TABLE(users_id uuid, country text, gender text, age text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service        boolean := (auth.jwt() ->> 'role') = 'service_role' OR session_user = 'supabase_auth_admin';
  v_uid            uuid    := CASE WHEN v_service AND p_user_id IS NOT NULL THEN p_user_id ELSE auth.uid() END;
  v_reg_country    text;
  v_ip_country     text;
  v_country        text;
  v_state          text;
  v_gender         text;
  v_age            text;
  v_status         text := NULL;
  v_feature_active boolean;
  v_has_profile    boolean := false;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT CASE WHEN ut.users_sex = 'Gender.male' THEN 'm' ELSE 'f' END,
           floor(extract(epoch FROM (now() - ut.users_dob::timestamptz)) / 31557600.0)::int::text,
           (SELECT lower(ct.country_two_iso_code) FROM country_table ct WHERE ct.country_id = ut.country_id)
      INTO v_gender, v_age, v_reg_country
    FROM public.users_table ut
    WHERE ut.users_id = v_uid;
    v_has_profile := FOUND;
  END IF;

  IF v_service THEN
    IF p_ip IS NOT NULL THEN
      SELECT r.country_code, r.state_code INTO v_ip_country, v_state FROM public.resolve_ip_geo(p_ip) r;
    END IF;
    -- LIVE first: explicit override (Lambda) → IP-derived (trigger) → registration (last resort).
    v_country := COALESCE(lower(nullif(p_country_override, '')), lower(nullif(v_ip_country, '')), v_reg_country);
  ELSE
    v_country := lower(nullif(current_setting('request.headers', true)::json ->> 'cf-ipcountry', 'XX'));
  END IF;

  -- Region/compliance ALWAYS applies (incl. new/profile-less users signing up).
  IF public.assert_allowed_region(p_ip, p_feature) = 'Region.blocked' THEN
    v_status := 'Region.blocked';
  END IF;

  -- Feature/cohort gate only applies to users who HAVE a profile. A brand-new OAuth/social user has
  -- no profile yet (null gender/age, and no registration country to back-stop a missed IP lookup), so
  -- gating them here would wrongly abort their sign-in and block onboarding. They pass the feature gate
  -- and get gated on their actual actions once onboarded (with real demographics/country).
  IF v_status IS NULL AND p_feature IS NOT NULL AND v_has_profile THEN
    v_feature_active := (public.get_feature_status(p_feature, p_locale, v_gender, v_age, v_country, v_state) ->> 'features_active')::boolean;
    IF NOT COALESCE(v_feature_active, true) THEN
      v_status := 'Feature.unavailable';
    END IF;
  END IF;

  RETURN QUERY SELECT v_uid, v_country, v_gender, v_age, v_status;
END
$function$
