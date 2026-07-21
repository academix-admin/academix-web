-- schema:   public
-- function: record_pool(p_pools_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.record_pool(p_pools_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  config       JSONB;
  supabase_url TEXT;
  admin_jwt TEXT;
BEGIN

  -- ── Load supabase_url from config ─────────────────────────────────────────
  -- admin_jwt is passed in from update_pool_status which already loaded config,
  -- but supabase_url is needed here for the async_rpc call so we load it once.
  config       := get_platform_config();
  supabase_url := config->>'supabase_url';
  admin_jwt    := config->>'admin_jwt';
  
  -- ── Settlement chain — sequential, each guards against double-execution ───
  PERFORM end_pool_quiz(p_pools_id);
  PERFORM grade_pool_quiz(p_pools_id);
  PERFORM rank_pool_quiz(p_pools_id);
  PERFORM reward_pool_quiz(p_pools_id);
  PERFORM complete_pool_quiz(p_pools_id);
  PERFORM pay_pool_quiz(p_pools_id);
  PERFORM settle_pool_quiz(p_pools_id);

  -- ── Gamify — async, runs after settlement is fully committed ──────────────
  -- Placed last so it never blocks or rolls back the financial settlement chain.
  -- Uses async_rpc so gamification failures do not affect pool financials.
  PERFORM async_rpc(
    'gamify_pool_quiz',
    jsonb_build_object(
      'p_pool_id',  p_pools_id,
      'jwt_token',  admin_jwt
    ),
    supabase_url,
    admin_jwt
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in record_pool for pool %: %', p_pools_id, SQLERRM;
    RAISE;  -- re-raise so update_pool_status exception handler also sees it
END;
$function$

