-- schema:   public
-- function: complete_pool_quiz(p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.complete_pool_quiz(p_pool_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  results             JSONB[];
  result              JSONB;
  member              UUID;
  member_rank         INT;
  member_category     TEXT;
  members_size        INT;
  r_id                UUID;
  t_id                UUID;
  price_amount        NUMERIC;
  paid_amount         NUMERIC;
  status              TEXT;
  verify              JSONB;
  transaction_check   BOOLEAN;
  redeemable_check    BOOLEAN;
  sender_profile      JSONB;
  receiver_profile    JSONB;
  transaction_details JSONB;
  pool_data           RECORD;
  unpaid_count        INT;
  members_paid_total  NUMERIC;
  i                   INT;
BEGIN

  -- ── [1] Lock pool row ─────────────────────────────────────────────────────
  SELECT * INTO pool_data
  FROM pools_table
  WHERE pools_id = p_pool_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  -- ── [2] Guard: must be rewarded and not yet completed ─────────────────────
  IF pool_data.pools_rewarded_at IS NULL OR pool_data.pools_completed_at IS NOT NULL THEN
    RETURN;
  END IF;

  -- ── [3] Load all members ordered by rank ──────────────────────────────────
  SELECT
    array_agg(
      jsonb_build_object(
        'users_id',       pmt.users_id,
        'rank',           pmt.pools_members_rank,
        'category',       pmt.pools_members_category,
        'amount',         pmt.pools_members_price,
        'paid',           pmt.pools_members_paid_amount,
        'redeemable_id',  pmt.redeemable_id,
        'transaction_id', pmt.transaction_id
      ) ORDER BY pmt.pools_members_rank
    ),
    COUNT(pmt.pools_members_id)
  INTO results, members_size
  FROM pools_members_table pmt
  WHERE pmt.pools_id = pool_data.pools_id;

  IF results IS NULL OR array_length(results, 1) = 0 THEN
    RETURN;
  END IF;

  -- ── [4] Process each member ───────────────────────────────────────────────
  FOR i IN 1..array_length(results, 1) LOOP
    result          := results[i];
    member          := (result->>'users_id')::UUID;
    member_rank     := (result->>'rank')::INT;
    member_category := (result->>'category')::TEXT;
    price_amount    := (result->>'amount')::NUMERIC;
    paid_amount     := (result->>'paid')::NUMERIC;
    r_id            := (result->>'redeemable_id')::UUID;
    t_id            := (result->>'transaction_id')::UUID;

    -- Reset per-iteration state
    transaction_check   := FALSE;
    redeemable_check    := FALSE;
    transaction_details := NULL;

    -- Skip members already processed (NULL = not yet processed)
    IF paid_amount IS NOT NULL THEN
      CONTINUE;
    END IF;

    -- ── [4a] Verify transaction status ────────────────────────────────────────
    -- t_id present → must be a successful transaction
    -- t_id absent  → redeemable_id presence is sufficient
    IF t_id IS NOT NULL THEN
      SELECT tt.transaction_receiver_status INTO status
      FROM transaction_table tt
      WHERE tt.transaction_id = t_id;

      transaction_check := (status = 'TransactionStatus.success');
    ELSE
      transaction_check := (r_id IS NOT NULL);
    END IF;

    -- ── [4b] Verify redeemable / rule ─────────────────────────────────────────
    -- r_id present → validate against pool rule
    -- r_id absent  → transaction_id presence is sufficient
    IF r_id IS NOT NULL THEN
      SELECT * INTO verify FROM verify_code_rule(
        member,
        r_id,
        jsonb_build_object(
          'category', member_category,
          'rank',     member_rank
        )
      );
      redeemable_check := (verify->'check_data'->>'overall_check')::BOOLEAN = TRUE;
    ELSE
      redeemable_check := (t_id IS NOT NULL);
    END IF;

    -- ── [4c] Determine payout amount ──────────────────────────────────────────
    -- Both checks must pass for a positive payout.
    -- Negative = failure marker — permanent, auditable, admin can reset.
    IF transaction_check = TRUE AND redeemable_check = TRUE THEN
      paid_amount := price_amount;
    ELSE
      paid_amount := -(price_amount);
    END IF;

    -- ── [4d] Resolve payment profiles ─────────────────────────────────────────
    SELECT * INTO receiver_profile FROM create_or_get_academix_profile(member,'','','','');
    SELECT * INTO sender_profile   FROM create_or_get_wallet_profile(member,'','','','');

    IF sender_profile IS NULL OR receiver_profile IS NULL THEN
      -- Cannot pay without profiles — leave paid_amount NULL for retry
      CONTINUE;
    END IF;

    -- ── [4e] Execute payment for positive amounts ──────────────────────────────
    IF paid_amount > 0 THEN
      SELECT * INTO transaction_details FROM handle_user_payment(
        member,
        (sender_profile->>'payment_profile_id')::UUID,
        (receiver_profile->>'payment_profile_id')::UUID,
        paid_amount,
        'TransactionType.participation',
        'en',
        '', '', '', ''
      );
    END IF;

    -- ── [4f] Record result ─────────────────────────────────────────────────────
    --
    -- paid_amount < 0 → verification failed — record failure marker immediately.
    --                   Skipped on all future retries. Admin can reset to NULL.
    --
    -- paid_amount > 0 → record only on confirmed Payment.success.
    --                   If handle_user_payment fails unexpectedly,
    --                   paid_amount stays NULL and member is retried next run.
    IF paid_amount < 0 THEN

      UPDATE pools_members_table
      SET pools_members_paid_amount = paid_amount
      WHERE pools_id = pool_data.pools_id AND users_id = member;

    ELSIF paid_amount > 0
      AND (transaction_details->'transaction_details'->>'transaction_id')::UUID IS NOT NULL
      AND (transaction_details->>'status')::TEXT = 'Payment.success'
    THEN

      -- Link participation transaction back to this pool
      UPDATE transaction_table
      SET pools_id = p_pool_id
      WHERE transaction_id =
        (transaction_details->'transaction_details'->>'transaction_id')::UUID;

      UPDATE pools_members_table
      SET pools_members_paid_amount = paid_amount
      WHERE pools_id = pool_data.pools_id AND users_id = member;

    END IF;

  END LOOP;

  -- ── [5] Mark pool complete only when all members are processed ────────────
  --
  --    Any member with paid_amount IS NULL means retry is still needed.
  --    Negative amounts are processed — they do not block completion.
  SELECT COUNT(*) INTO unpaid_count
  FROM pools_members_table
  WHERE pools_id = p_pool_id
    AND pools_members_paid_amount IS NULL;

  IF unpaid_count = 0 THEN

    -- Sum only positive paid amounts — negative = failed verification,
    -- not a real payment, excluded from the financial summary.
    SELECT COALESCE(SUM(pools_members_paid_amount), 0) INTO members_paid_total
    FROM pools_members_table
    WHERE pools_id = p_pool_id
      AND pools_members_paid_amount > 0;

    UPDATE pools_table
    SET
      pools_completed_at = clock_timestamp(),
      -- Record total actually paid to players (positive amounts only)
      pools_members_paid = members_paid_total
    WHERE pools_id = pool_data.pools_id;

  END IF;

END;
$function$

