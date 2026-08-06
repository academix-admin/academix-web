-- schema:   public
-- function: get_platform_config()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)
-- Secrets (admin_jwt, scheduler_bearer_token) now live in Supabase Vault, not the plaintext
-- platform_config_table. Same JSONB output shape (secrets overlaid from Vault), so record_pool /
-- update_pool_status are unchanged. Execute is revoked from anon/authenticated/PUBLIC — internal only.

CREATE OR REPLACE FUNCTION public.get_platform_config()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public','vault'
AS $function$
  SELECT coalesce(
           (SELECT jsonb_object_agg(config_key, config_value) FROM public.platform_config_table),
           '{}'::jsonb
         )
         || jsonb_strip_nulls(jsonb_build_object(
              'admin_jwt',
                (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'platform_admin_jwt' LIMIT 1),
              'scheduler_bearer_token',
                (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'platform_scheduler_bearer_token' LIMIT 1)
            ));
$function$;
REVOKE EXECUTE ON FUNCTION public.get_platform_config() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_config() TO service_role;
