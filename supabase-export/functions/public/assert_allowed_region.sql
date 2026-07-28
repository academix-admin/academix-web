-- schema: public
-- function: assert_allowed_region(p_ip,p_feature) — gathers request signals (p_ip or x-forwarded-for
-- + cf-ipcountry/cf-region) and delegates to region_block_status.
CREATE OR REPLACE FUNCTION public.assert_allowed_region(p_ip inet DEFAULT NULL::inet, p_feature text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ip inet := p_ip; v_hdr json; v_xff text; v_country text; v_state text;
BEGIN
  BEGIN v_hdr := nullif(current_setting('request.headers', true), '')::json; EXCEPTION WHEN others THEN v_hdr := NULL; END;
  IF v_ip IS NULL AND v_hdr IS NOT NULL THEN
    v_xff := v_hdr ->> 'x-forwarded-for';
    IF v_xff IS NOT NULL AND v_xff <> '' THEN
      BEGIN v_ip := split_part(v_xff, ',', 1)::inet; EXCEPTION WHEN others THEN v_ip := NULL; END;
    END IF;
  END IF;
  IF v_hdr IS NOT NULL THEN
    v_country := nullif(v_hdr ->> 'cf-ipcountry', 'XX');
    v_state   := COALESCE(v_hdr ->> 'cf-region-code', v_hdr ->> 'cf-region');
  END IF;
  RETURN public.region_block_status(v_ip, v_country, v_state, p_feature);
END;
$function$;
