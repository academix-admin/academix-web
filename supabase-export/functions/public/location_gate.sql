-- Pre-auth location gate: is a visitor from the current IP allowed to use a feature, by REGION +
-- COUNTRY only (ignores gender/age, which are unknown before sign-in). Reuses assert_allowed_region
-- (geo_blocklist) + the feature's country_control (decontrol). Lets the LOGIN screen resolve WHY a
-- sign-in was blocked (GoTrue flattens the trigger's reason). Returns Region.blocked|Feature.unavailable|NULL.
CREATE OR REPLACE FUNCTION public.location_gate(p_feature text DEFAULT NULL::text, p_locale text DEFAULT 'en'::text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_country text := lower(nullif(current_setting('request.headers', true)::json ->> 'cf-ipcountry', 'XX'));
BEGIN
  IF public.assert_allowed_region(NULL, p_feature) = 'Region.blocked' THEN
    RETURN 'Region.blocked';
  END IF;
  IF p_feature IS NOT NULL AND v_country IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.features_table ft
       WHERE ft.features_checker = p_feature
         AND (SELECT value FROM public.decontrol(ft.country_control, v_country, p_locale, ARRAY['default']::text[], true)) = TRUE
    ) THEN
      RETURN 'Feature.unavailable';
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.location_gate(text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.location_gate(text,text) TO anon, authenticated, service_role;
