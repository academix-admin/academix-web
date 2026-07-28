-- schema:   public
-- function: get_feature_status(p_feature, p_locale, p_gender, p_age, p_country_override) RETURNS jsonb
-- Country from cf-ipcountry; service-role callers may override via p_country_override. Synced with iewqfmkngcgayxbbnpiz.

CREATE OR REPLACE FUNCTION public.get_feature_status(p_feature text, p_locale text, p_gender text, p_age text, p_country_override text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  p_country text;
  result jsonb;
BEGIN
  -- Country = server-observed IP (cf-ipcountry) for direct browser calls. A SERVICE-ROLE caller
  -- (e.g. the /api/payment Next route, which sees the real client IP) may pass p_country_override;
  -- a browser (authenticated role) cannot, so the gate stays unspoofable.
  IF (auth.jwt() ->> 'role') = 'service_role' AND p_country_override IS NOT NULL THEN
    p_country := lower(p_country_override);
  ELSE
    p_country := lower(nullif(current_setting('request.headers', true)::json ->> 'cf-ipcountry', 'XX'));
  END IF;

  SELECT jsonb_build_object('features_active', ft.features_active) INTO result
    FROM features_table ft
   WHERE ft.features_checker = p_feature
     AND (SELECT value FROM decontrol(ft.language_control, p_locale,  p_locale)) = TRUE
     AND (SELECT value FROM decontrol(ft.country_control,  p_country, p_locale)) = TRUE
     AND (SELECT value FROM decontrol(ft.gender_control,   p_gender,  p_locale)) = TRUE
     AND (SELECT value FROM decontrol(ft.age_control,      p_age,     p_locale)) = TRUE
   LIMIT 1;

  IF result IS NULL THEN
    RETURN jsonb_build_object('features_active', FALSE);
  END IF;
  RETURN result;
END; $function$
