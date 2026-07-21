-- schema:   public
-- function: get_platform_config()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_platform_config()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT jsonb_object_agg(config_key, config_value)
  FROM platform_config_table;
$function$

