-- schema: public
-- function: get_feature_status(...,p_country_override,p_state_override) — features allowlist via decontrol
-- (language/country/gender/age + optional state_control). Trusts service_role|supabase_auth_admin for overrides.
-- NULL-tolerant for GENDER/AGE only (profile-derived, absent for a brand-new signup) — a null gender/age
-- passes that control. country (IP-derived) and language (client-sent) are always resolvable, so they are
-- always checked. features_active (manual on/off) and every checked control still enforce.
CREATE OR REPLACE FUNCTION public.get_feature_status(p_feature text, p_locale text, p_gender text, p_age text, p_country_override text DEFAULT NULL::text, p_state_override text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_trusted boolean := (auth.jwt() ->> 'role') = 'service_role' OR session_user = 'supabase_auth_admin';
  p_country text;
  v_state   text;
  result jsonb;
BEGIN
  IF v_trusted AND p_country_override IS NOT NULL THEN
    p_country := lower(p_country_override);
  ELSE
    p_country := lower(nullif(current_setting('request.headers', true)::json ->> 'cf-ipcountry', 'XX'));
  END IF;

  IF v_trusted THEN
    v_state := lower(nullif(p_state_override, ''));
  ELSE
    BEGIN v_state := lower(nullif(COALESCE(current_setting('request.headers', true)::json ->> 'cf-region-code',
                                           current_setting('request.headers', true)::json ->> 'cf-region'), '')); EXCEPTION WHEN others THEN v_state := NULL; END;
  END IF;

  SELECT jsonb_build_object('features_active', ft.features_active) INTO result
    FROM features_table ft
   WHERE ft.features_checker = p_feature
     AND (SELECT value FROM decontrol(ft.language_control, p_locale,  p_locale)) = TRUE
     AND (SELECT value FROM decontrol(ft.country_control,  p_country, p_locale)) = TRUE
     AND (p_gender IS NULL OR (SELECT value FROM decontrol(ft.gender_control, p_gender, p_locale)) = TRUE)
     AND (p_age    IS NULL OR (SELECT value FROM decontrol(ft.age_control,    p_age,    p_locale)) = TRUE)
     AND (ft.state_control IS NULL OR v_state IS NULL
          OR (SELECT value FROM decontrol(ft.state_control, v_state, p_locale, ARRAY['default']::text[], true)) = TRUE)
   LIMIT 1;

  IF result IS NULL THEN
    RETURN jsonb_build_object('features_active', FALSE);
  END IF;
  RETURN result;
END; $function$;
