-- schema:   public
-- function: reward_pool_quiz(p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.reward_pool_quiz(p_pool_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  pool_data           RECORD;
  members_size        INT;
  quiz_price          NUMERIC;
  top_price           NUMERIC;
  mid_price           NUMERIC;
  bot_price           NUMERIC;
  dev_charge_rate     NUMERIC;
  quiz_points         INT;
  mode_checker        TEXT;
  min_size            INT;

  dev_charge_list     JSONB := '{"6": 2.38, "7": 4.76, "8": 9.52, "9": 14.28}';

  dev_charge          NUMERIC;
  total_pool          NUMERIC;
  remaining_after_dev NUMERIC;
  total_paid          NUMERIC;
  remaining_for_rank  NUMERIC;
  rank_weight_total   NUMERIC;

  winners_size        INT;
  each_category       INT;
  top_start           INT;
  top_end             INT;
  mid_start           INT;
  mid_end             INT;
  bot_start           INT;
  bot_end             INT;
BEGIN

  -- ── [1] Lock pool row ─────────────────────────────────────────────────────
  SELECT * INTO pool_data
  FROM pools_table
  WHERE pools_id = p_pool_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  -- ── [2] Guard: must be ranked and not yet rewarded ────────────────────────
  IF pool_data.pools_ranked_at IS NULL OR pool_data.pools_rewarded_at IS NOT NULL THEN
    RETURN;
  END IF;

  -- ── [3] Load challenge parameters ─────────────────────────────────────────
  SELECT
    ct.challenge_min_participants,
    ct.challenge_price,
    ct.challenge_top_share,
    ct.challenge_mid_share,
    ct.challenge_bot_share,
    ct.challenge_development_charge,
    ct.challenge_points,
    gmt.game_mode_checker
  INTO
    min_size, quiz_price, top_price, mid_price, bot_price,
    dev_charge_rate, quiz_points, mode_checker
  FROM challenge_table ct
  LEFT JOIN game_mode_table gmt ON gmt.game_mode_id = ct.game_mode_id
  WHERE ct.challenge_id = pool_data.challenge_id;

  -- ── [4] Count members ─────────────────────────────────────────────────────
  SELECT COUNT(*) INTO members_size
  FROM pools_members_table
  WHERE pools_id = p_pool_id;

  IF members_size = 0 THEN RETURN; END IF;

  -- ── [5] Multiplayer ───────────────────────────────────────────────────────
  IF mode_checker <> 'GameMode.1v1' THEN

    -- ── [5a] Pool financials ─────────────────────────────────────────────────
    --
    --    dev_charge is ring-fenced for the platform and pay_pool_quiz.
    --    Players only ever receive from remaining_after_dev.
    --    Tiered dev charge for 6–9, flat rate for 10+.
    total_pool := members_size * quiz_price;

    dev_charge := total_pool * (
      COALESCE(
        (dev_charge_list->>(members_size::TEXT))::NUMERIC,
        dev_charge_rate
      ) / 100
    );

    remaining_after_dev := total_pool - dev_charge;

    -- ── [5b] Winner category boundaries ──────────────────────────────────────
    --
    --    winners_size scales with pool: at least 3, at most members_size.
    --    Each category gets ~1/3. Remainder adjustment ensures exact sum.
    winners_size := GREATEST(3, LEAST(
      CEIL((3.0 * members_size) / GREATEST(min_size, 10))::INT,
      members_size
    ));

    each_category := CEIL(winners_size / 3.0)::INT;

    top_end := each_category;
    mid_end := each_category * 2;
    bot_end := winners_size;

    CASE winners_size % 3
      WHEN 1 THEN top_end := top_end - 1; mid_end := mid_end - 1;
      WHEN 2 THEN top_end := top_end - 1;
      ELSE NULL;
    END CASE;

    top_start := 1;
    mid_start := top_end + 1;
    bot_start := mid_end + 1;

    -- ── [5c] Assign winner prizes and points ──────────────────────────────────
    UPDATE pools_members_table pmt
    SET
      pools_members_category = CASE
        WHEN pmt.pools_members_rank BETWEEN top_start AND top_end THEN 'Position.top'
        WHEN pmt.pools_members_rank BETWEEN mid_start AND mid_end THEN 'Position.mid'
        WHEN pmt.pools_members_rank BETWEEN bot_start AND bot_end THEN 'Position.bot'
      END,
      pools_members_price = CASE
        WHEN pmt.pools_members_rank BETWEEN top_start AND top_end THEN top_price
        WHEN pmt.pools_members_rank BETWEEN mid_start AND mid_end THEN mid_price
        WHEN pmt.pools_members_rank BETWEEN bot_start AND bot_end THEN bot_price
      END,
      pools_members_points = (
        (members_size - (pmt.pools_members_rank - 1))::NUMERIC / members_size
      ) * quiz_points
    WHERE pmt.pools_id = p_pool_id
      AND pmt.pools_members_rank BETWEEN top_start AND bot_end;

    -- ── [5d] Remaining after winner prizes ────────────────────────────────────
    SELECT COALESCE(SUM(pools_members_price), 0) INTO total_paid
    FROM pools_members_table
    WHERE pools_id = p_pool_id
      AND pools_members_rank BETWEEN top_start AND bot_end;

    remaining_for_rank := GREATEST(remaining_after_dev - total_paid, 0);

    -- ── [5e] Rank weight total ────────────────────────────────────────────────
    --
    --    Weight = members_size − rank + 1.
    --    Higher-ranked members receive a proportionally larger share.
    SELECT COALESCE(SUM(members_size - pools_members_rank + 1), 0)
    INTO rank_weight_total
    FROM pools_members_table
    WHERE pools_id = p_pool_id
      AND pools_members_rank > bot_end;

    -- ── [5f] Assign rank prizes and points ────────────────────────────────────
    --
    --    Each rank member's prize = their weight / total_weight × remaining_for_rank.
    --    Σ(weight/total_weight) = 1 so total rank prizes = remaining_for_rank exactly.
    UPDATE pools_members_table pmt
    SET
      pools_members_category = 'Position.rank',
      pools_members_price    = CASE
        WHEN rank_weight_total > 0
        THEN GREATEST(0,
          (remaining_for_rank * (members_size - pmt.pools_members_rank + 1))
          / rank_weight_total
        )
        ELSE 0
      END,
      pools_members_points = (
        (members_size - pmt.pools_members_rank + 1)::NUMERIC / members_size
      ) * quiz_points
    WHERE pmt.pools_id = p_pool_id
      AND pmt.pools_members_rank > bot_end;

  -- ── [6] 1v1 ───────────────────────────────────────────────────────────────
  --
  --    The remainder after top + mid IS the dev_charge — goes entirely to
  --    platform / pay_pool_quiz contributors. Players receive exactly
  --    top_price (winner) and mid_price (loser). No rank members in 1v1.
  ELSE

    total_pool := quiz_price * 2;
    dev_charge := total_pool - (top_price + mid_price);

    UPDATE pools_members_table pmt
    SET
      pools_members_category = CASE
        WHEN pmt.pools_members_rank = 1 THEN 'Position.top'
        ELSE                                 'Position.mid'
      END,
      pools_members_price = CASE
        WHEN pmt.pools_members_rank = 1 THEN top_price
        ELSE                                 mid_price
      END,
      pools_members_points = (
        (members_size - (pmt.pools_members_rank - 1))::NUMERIC / members_size
      ) * quiz_points
    WHERE pmt.pools_id = p_pool_id;

  END IF;

  -- ── [7] Mark pool as rewarded + record pool financials ────────────────────
  --
  --    pools_total_amount and pools_dev_charge are set here because
  --    reward_pool_quiz is the only function that computes these values.
  --    complete_pool_quiz and pay_pool_quiz read them later to compute
  --    pools_platform_kept.
  UPDATE pools_table
  SET
    pools_rewarded_at  = clock_timestamp(),
    pools_total_amount = total_pool,
    pools_dev_charge   = dev_charge
  WHERE pools_id = p_pool_id;

END;
$function$

