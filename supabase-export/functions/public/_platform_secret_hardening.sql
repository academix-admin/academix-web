-- =====================================================================================
-- Platform-secret hardening (read-only mirror of the deployed migration).
--
-- Problem fixed:
--   * get_platform_config() was SECURITY DEFINER and executable by anon/authenticated, and it
--     returned admin_jwt + scheduler_bearer_token in PLAINTEXT — any signed-in user could read
--     the service-role JWT.
--   * async_rpc / gamify_pool_quiz were executable by PUBLIC (SSRF + arbitrary internal RPC).
--   * admin_jwt + scheduler_bearer_token were stored as plaintext rows in platform_config_table.
--
-- Fix: lock all of these internal functions to service_role only, and move the two secrets into
-- Supabase Vault (seeded FROM the existing table values — no secret literal here). get_platform_config
-- overlays the secrets from Vault so its callers (record_pool, update_pool_status) are unchanged.
-- The updated get_platform_config() and async_rpc() bodies are mirrored in their own files.
-- =====================================================================================

-- 1) Lock the internal money/scheduler functions to service_role (no client calls any of them).
REVOKE EXECUTE ON FUNCTION public.get_platform_config()                              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.async_rpc(text, jsonb, text, text, text)           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gamify_pool_quiz(uuid, text)                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_pool(uuid)                                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_pool_status(uuid, text, boolean)             FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_platform_config()                              TO service_role;
GRANT  EXECUTE ON FUNCTION public.async_rpc(text, jsonb, text, text, text)           TO service_role;
GRANT  EXECUTE ON FUNCTION public.gamify_pool_quiz(uuid, text)                        TO service_role;
GRANT  EXECUTE ON FUNCTION public.record_pool(uuid)                                   TO service_role;
GRANT  EXECUTE ON FUNCTION public.update_pool_status(uuid, text, boolean)             TO service_role;

-- 2) Move the two secrets into Vault, seeded from the current table values (idempotent),
--    then delete the plaintext rows. Run BEFORE the get_platform_config redefinition.
DO $$
DECLARE v text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'platform_admin_jwt') THEN
    SELECT config_value INTO v FROM public.platform_config_table WHERE config_key = 'admin_jwt';
    IF v IS NOT NULL THEN
      PERFORM vault.create_secret(v, 'platform_admin_jwt', 'Service-role JWT for internal async_rpc self-calls');
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'platform_scheduler_bearer_token') THEN
    SELECT config_value INTO v FROM public.platform_config_table WHERE config_key = 'scheduler_bearer_token';
    IF v IS NOT NULL THEN
      PERFORM vault.create_secret(v, 'platform_scheduler_bearer_token', 'Bearer token for the pool scheduler');
    END IF;
  END IF;
END $$;

DELETE FROM public.platform_config_table WHERE config_key IN ('admin_jwt', 'scheduler_bearer_token');

-- 3) get_platform_config() and async_rpc() are redefined in their own mirror files
--    (get_platform_config.sql, async_rpc.sql) to read the secrets from Vault and to harden egress.
