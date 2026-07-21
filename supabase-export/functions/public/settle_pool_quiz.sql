-- schema:   public
-- function: settle_pool_quiz(p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.settle_pool_quiz(p_pool_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_platform_kept NUMERIC;
  pool_data       RECORD;
BEGIN

  -- -----------------------------------------------------------------------
  -- 1. Lock pool row — prevents concurrent double-settlement.
  -- -----------------------------------------------------------------------
  SELECT * INTO pool_data
  FROM pools_table
  WHERE pools_id = p_pool_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  -- -----------------------------------------------------------------------
  -- 2. Guard: pay_pool_quiz must have run (pools_paid_at set)
  --           ledger must not already be written (pools_ledger_written_at null)
  --    pools_ledger_written_at IS NOT NULL is the single signal that this
  --    pool is fully financially closed — no separate platform_taken needed.
  -- -----------------------------------------------------------------------
  IF pool_data.pools_paid_at IS NULL
    OR pool_data.pools_ledger_written_at IS NOT NULL
  THEN
    RETURN;
  END IF;

  -- -----------------------------------------------------------------------
  -- 3. Read pools_platform_kept — set by pay_pool_quiz.
  --    Must be positive to write a ledger entry.
  --    If null or zero something went wrong upstream — log and bail.
  -- -----------------------------------------------------------------------
  v_platform_kept := pool_data.pools_platform_kept;

  IF v_platform_kept IS NULL OR v_platform_kept <= 0 THEN
    RAISE WARNING 'settle_pool_quiz: skipping pool % — platform_kept=% is null or zero',
      p_pool_id, v_platform_kept;
    RETURN;
  END IF;

  -- -----------------------------------------------------------------------
  -- 4. Write platform earnings to ledger.
  --    Single ADC row: type='quiz', gross=our_profit=pools_platform_kept.
  -- -----------------------------------------------------------------------
  PERFORM write_quiz_ledger_entry(
    p_pool_id,
    v_platform_kept
  );

  -- -----------------------------------------------------------------------
  -- 5. Stamp pools_ledger_written_at — this is the single source of truth
  --    that the pool is fully financially closed. A pool with this column
  --    NOT NULL is guaranteed to have a corresponding wallet_ledger_table
  --    entry. No other column needed.
  -- -----------------------------------------------------------------------
  UPDATE pools_table
  SET pools_ledger_written_at = clock_timestamp()
  WHERE pools_id = p_pool_id;

  RAISE NOTICE 'settle_pool_quiz: pool % settled — platform_kept=%, ledger written',
    p_pool_id, v_platform_kept;

END;
$function$

