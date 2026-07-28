-- schema:   public
-- function: gate_check(p_feature, p_locale, p_user_id, p_country_override) RETURNS TABLE(users_id, country, gender, age, status)
-- Workstream I. Browser: identity=auth.uid(), country=cf-ipcountry. Service-role (Lambdas): identity=p_user_id,
-- country = p_country_override (IP-derived) or registration country. Synced iewqfmkngcgayxbbnpiz.

CREATE OR REPLACE FUNCTION public.gate_check(p_feature text DEFAULT NULL::text, p_locale text DEFAULT 'en'::text, p_user_id uuid DEFAULT NULL::uuid, p_country_override text DEFAULT NULL::text)
 RETURNS TABLE(users_id uuid, country text, gender text, age text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service        boolean := (auth.jwt() ->> 'role') = 'service_role';
  v_uid            uuid    := CASE WHEN v_service AND p_user_id IS NOT NULL THEN p_user_id ELSE auth.uid() END;
  v_reg_country    text;
  v_country        text;
  v_gender         text;
  v_age            text;
  v_status         text := NULL;
  v_feature_active boolean;
BEGIN
  -- gender/age (+ the registration country as a fallback) from the profile
  IF v_uid IS NOT NULL THEN
    SELECT CASE WHEN ut.users_sex = 'Gender.male' THEN 'm' ELSE 'f' END,
           floor(extract(epoch FROM (now() - ut.users_dob::timestamptz)) / 31557600.0)::int::text,
           (SELECT lower(ct.country_two_iso_code) FROM country_table ct WHERE ct.country_id = ut.country_id)
      INTO v_gender, v_age, v_reg_country
    FROM public.users_table ut
    WHERE ut.users_id = v_uid;
  END IF;

  -- country: browser callers use the live IP (cf-ipcountry). SERVICE-ROLE callers (Lambdas) may pass
  -- an IP-derived override (e.g. make_payment geolocates the real client IP); else registration country.
  IF v_service THEN
    v_country := COALESCE(lower(nullif(p_country_override, '')), v_reg_country);
  ELSE
    v_country := lower(nullif(current_setting('request.headers', true)::json ->> 'cf-ipcountry', 'XX'));
  END IF;

  IF public.assert_allowed_region() = 'Region.blocked' THEN
    v_status := 'Region.blocked';
  END IF;

  IF v_status IS NULL AND p_feature IS NOT NULL THEN
    v_feature_active := (public.get_feature_status(p_feature, p_locale, v_gender, v_age, v_country) ->> 'features_active')::boolean;
    IF NOT COALESCE(v_feature_active, true) THEN
      v_status := 'Feature.unavailable';
    END IF;
  END IF;

  RETURN QUERY SELECT v_uid, v_country, v_gender, v_age, v_status;
END
$function$
REVOKE ALL ON FUNCTION public.gate_check(text,text,uuid,text) FROM public;
GRANT EXECUTE ON FUNCTION public.gate_check(text,text,uuid,text) TO anon, authenticated, service_role;
