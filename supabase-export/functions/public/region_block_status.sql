-- schema: public
-- function: region_block_status(p_ip,p_country,p_state,p_feature) — the ONE compliance checker.
-- Matches geo_blocklist rules (ip/country/state), global (feature NULL) + per-feature. Country/state
-- derived from p_ip via resolve_ip_geo when not supplied.
CREATE OR REPLACE FUNCTION public.region_block_status(p_ip inet DEFAULT NULL::inet, p_country text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_feature text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_country text := lower(nullif(p_country, ''));
  v_state   text := lower(nullif(p_state, ''));
  v_geo     record;
BEGIN
  IF v_country IS NULL AND p_ip IS NOT NULL THEN
    SELECT r.country_code, r.state_code INTO v_geo FROM public.resolve_ip_geo(p_ip) r;
    IF FOUND THEN
      v_country := v_geo.country_code;
      v_state   := COALESCE(v_state, v_geo.state_code);
    END IF;
  END IF;

  IF p_ip IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.geo_blocklist b
     WHERE b.block_type='ip' AND b.active AND (b.expires_at IS NULL OR b.expires_at > now())
       AND (b.feature IS NULL OR b.feature = p_feature)
       AND p_ip <<= b.cidr_range
  ) THEN RETURN 'Region.blocked'; END IF;

  IF v_country IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.geo_blocklist b
     WHERE b.block_type='country' AND b.active AND (b.expires_at IS NULL OR b.expires_at > now())
       AND (b.feature IS NULL OR b.feature = p_feature)
       AND lower(b.country_code)=v_country
  ) THEN RETURN 'Region.blocked'; END IF;

  IF v_country IS NOT NULL AND v_state IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.geo_blocklist b
     WHERE b.block_type='state' AND b.active AND (b.expires_at IS NULL OR b.expires_at > now())
       AND (b.feature IS NULL OR b.feature = p_feature)
       AND lower(b.country_code)=v_country AND lower(b.state_code)=v_state
  ) THEN RETURN 'Region.blocked'; END IF;

  RETURN NULL;
END;
$function$;
