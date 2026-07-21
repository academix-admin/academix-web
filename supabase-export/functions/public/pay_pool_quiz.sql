-- schema:   public
-- function: pay_pool_quiz(p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.pay_pool_quiz(p_pool_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  member_record       RECORD;
  member_id           UUID;
  amount_due          NUMERIC := 0;
  already_paid_amount NUMERIC := 0;
  remaining_amount    NUMERIC := 0;
  creator_share       NUMERIC;
  reviewer_share      NUMERIC;
  winner_payout       NUMERIC;
  loser_payout        NUMERIC;
  dev_charge_rate     NUMERIC;
  dev_charge_amount   NUMERIC;
  entry_fee           NUMERIC;
  question_count      INTEGER;
  players_count       INTEGER;
  transaction_details JSONB;
  receiver_profile    JSONB;
  sender_profile      JSONB;
  t_id                UUID;
  response_status     TEXT;
  game_mode           TEXT;
  revenue_role        JSONB;
  transaction_id_text TEXT;
  total_pool          NUMERIC;
  base_shares_total   NUMERIC;
  role_pool           NUMERIC;
  total_weights       NUMERIC;
  pool_data           RECORD;
  role_key            TEXT;
  role_val            NUMERIC;
  contributors_paid   NUMERIC := 0;
BEGIN
  SELECT *
  INTO pool_data
  FROM pools_table
  WHERE pools_id = p_pool_id
  FOR UPDATE;

  IF pool_data.pools_completed_at IS NULL OR pool_data.pools_paid_at IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO players_count
  FROM pools_members_table
  WHERE pools_id = p_pool_id;

  SELECT
    ct.challenge_creator_share::NUMERIC,
    ct.challenge_reviewer_share::NUMERIC,
    gmt.game_mode_checker,
    ct.challenge_role_share,
    ct.challenge_top_share::NUMERIC,
    ct.challenge_mid_share::NUMERIC,
    ct.challenge_development_charge::NUMERIC,
    ct.challenge_price::NUMERIC,
    COUNT(pqt.questions_id)
  INTO
    creator_share,
    reviewer_share,
    game_mode,
    revenue_role,
    winner_payout,
    loser_payout,
    dev_charge_rate,
    entry_fee,
    question_count
  FROM pools_table pt
  JOIN challenge_table ct ON ct.challenge_id = pt.challenge_id
  JOIN game_mode_table gmt ON gmt.game_mode_id = ct.game_mode_id
  LEFT JOIN pools_question_table pqt ON pqt.pools_id = pt.pools_id
  WHERE pt.pools_id = p_pool_id
  GROUP BY
    ct.challenge_creator_share,
    ct.challenge_reviewer_share,
    gmt.game_mode_checker,
    ct.challenge_role_share,
    ct.challenge_top_share,
    ct.challenge_mid_share,
    ct.challenge_development_charge,
    ct.challenge_price;

  IF game_mode = 'GameMode.1v1' THEN
    total_pool := entry_fee * 2;
    dev_charge_amount := total_pool - (winner_payout + loser_payout);
  ELSE
    total_pool := players_count * entry_fee;
    CASE
      WHEN players_count = 6 THEN dev_charge_amount := total_pool * 0.0238;
      WHEN players_count = 7 THEN dev_charge_amount := total_pool * 0.0476;
      WHEN players_count = 8 THEN dev_charge_amount := total_pool * 0.0952;
      WHEN players_count = 9 THEN dev_charge_amount := total_pool * 0.1428;
      ELSE dev_charge_amount := total_pool * (dev_charge_rate / 100);
    END CASE;
  END IF;

  base_shares_total := question_count * (creator_share + reviewer_share);
  role_pool := GREATEST(dev_charge_amount - base_shares_total, 0);

  total_weights := 0;
  FOR role_key, role_val IN
    SELECT key, (value::TEXT)::NUMERIC
    FROM jsonb_each(revenue_role)
  LOOP
    total_weights := total_weights + COALESCE(role_val, 0);
  END LOOP;

  RAISE NOTICE
    'Pool %: questions=%, players=%, mode=%, dev_charge=%, base_total=%, role_pool=%, total_weights=%',
    p_pool_id, question_count, players_count, game_mode,
    dev_charge_amount, base_shares_total, role_pool, total_weights;

  FOR member_record IN
    WITH contributor_rows AS (
      SELECT
        (SELECT (translation)::UUID
         FROM translate(qt.questions_created_by, pt.pools_locale)) AS users_id,
        'creator'::TEXT AS assign
      FROM pools_question_table pqt
      JOIN pools_table pt ON pt.pools_id = pqt.pools_id
      JOIN questions_table qt ON qt.questions_id = pqt.questions_id
      WHERE pqt.pools_id = p_pool_id

      UNION ALL

      SELECT
        (SELECT (translation)::UUID
         FROM translate(qt.questions_reviewed_by, pt.pools_locale)) AS users_id,
        'reviewer'::TEXT AS assign
      FROM pools_question_table pqt
      JOIN pools_table pt ON pt.pools_id = pqt.pools_id
      JOIN questions_table qt ON qt.questions_id = pqt.questions_id
      WHERE pqt.pools_id = p_pool_id
    ),
    contributor_rows_with_role AS (
      SELECT
        cr.users_id,
        cr.assign,
        (
          (get_user_fields(cr.users_id, ARRAY['roles_checker']))->'roles_tables'
        )->>'roles_levels' AS member_type
      FROM contributor_rows cr
      WHERE cr.users_id IS NOT NULL
    ),
    contributor_amounts AS (
      SELECT
        crr.users_id,
        CASE crr.assign
          WHEN 'creator' THEN
            creator_share +
            CASE
              WHEN total_weights > 0 AND role_pool > 0
              THEN (
                COALESCE((revenue_role ->> crr.member_type)::NUMERIC, 0) / total_weights
              ) * role_pool / NULLIF(question_count, 0)
              ELSE 0
            END
          WHEN 'reviewer' THEN
            reviewer_share +
            CASE
              WHEN total_weights > 0 AND role_pool > 0
              THEN (
                COALESCE((revenue_role ->> crr.member_type)::NUMERIC, 0) / total_weights
              ) * role_pool / NULLIF(question_count, 0)
              ELSE 0
            END
          ELSE 0
        END AS row_amount
      FROM contributor_rows_with_role crr
    )
    SELECT
      users_id,
      COALESCE(SUM(row_amount), 0) AS total_due
    FROM contributor_amounts
    GROUP BY users_id
  LOOP
    member_id := member_record.users_id;
    amount_due := member_record.total_due;

    IF member_id IS NULL OR amount_due <= 0 THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(tt.transaction_receiver_amount), 0)
    INTO already_paid_amount
    FROM transaction_table tt
    JOIN payment_profile_table ppt
      ON ppt.payment_profile_id = tt.payment_profile_receiver_id
    WHERE tt.pools_id = p_pool_id
      AND ppt.users_id = member_id
      AND tt.transaction_type = 'TransactionType.participation'
      AND tt.transaction_receiver_status = 'TransactionStatus.success';

    remaining_amount := GREATEST(amount_due - already_paid_amount, 0);

    IF remaining_amount <= 0 THEN
      RAISE NOTICE 'Skipping member % — already fully paid for pool %', member_id, p_pool_id;
      contributors_paid := contributors_paid + already_paid_amount;
      CONTINUE;
    END IF;

    SELECT *
    INTO receiver_profile
    FROM create_or_get_academix_profile(member_id, '', '', '', '');

    SELECT *
    INTO sender_profile
    FROM create_or_get_wallet_profile(member_id, '', '', '', '');

    IF sender_profile IS NULL OR receiver_profile IS NULL THEN
      RAISE WARNING
        'Skipping %: missing profile (sender=%, receiver=%)',
        member_id,
        sender_profile IS NOT NULL,
        receiver_profile IS NOT NULL;
      contributors_paid := contributors_paid + already_paid_amount;
      CONTINUE;
    END IF;

    SELECT *
    INTO transaction_details
    FROM handle_user_payment(
      member_id,
      (sender_profile ->>'payment_profile_id')::UUID,
      (receiver_profile ->>'payment_profile_id')::UUID,
      remaining_amount,
      'TransactionType.participation',
      'en',
      '', '', '', ''
    );

    IF transaction_details IS NULL THEN
      RAISE WARNING 'handle_user_payment returned NULL for member %', member_id;
      contributors_paid := contributors_paid + already_paid_amount;
      CONTINUE;
    END IF;

    response_status := transaction_details ->>'status';
    transaction_id_text := transaction_details ->'transaction_details'->>'transaction_id';

    IF response_status = 'Payment.success' AND transaction_id_text IS NOT NULL THEN
      contributors_paid := contributors_paid + already_paid_amount + remaining_amount;
      t_id := transaction_id_text::UUID;

      UPDATE transaction_table
      SET pools_id = p_pool_id
      WHERE transaction_id = t_id;
    ELSE
      RAISE WARNING
        'Payment failed for member %: status=%, tx_id=%',
        member_id, response_status, transaction_id_text;
      contributors_paid := contributors_paid + already_paid_amount;
    END IF;
  END LOOP;

  UPDATE pools_table
  SET
    pools_paid_at = clock_timestamp(),
    pools_contributors_paid = contributors_paid,
    pools_platform_kept = (
      ((pool_data.pools_total_amount - pool_data.pools_dev_charge) - pool_data.pools_members_paid)
      + (pool_data.pools_dev_charge - contributors_paid)
    )
  WHERE pools_id = pool_data.pools_id;

  RETURN;
END;
$function$

