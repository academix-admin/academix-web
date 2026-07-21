-- schema:   public
-- function: check_wallet_balance_for_withdrawal(p_wallet_id uuid, p_amount numeric, p_fw_balance numeric)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.check_wallet_balance_for_withdrawal(p_wallet_id uuid, p_amount numeric, p_fw_balance numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_wallet_balance      NUMERIC     := 0;
    v_user_principal      NUMERIC     := 0;
    v_our_profit          NUMERIC     := 0;
    v_float_minimum       NUMERIC     := 0;
    v_float_target        NUMERIC     := 0;
    v_replenish_needed    BOOLEAN     := FALSE;
    v_last_alert_at       TIMESTAMPTZ;
    v_alert_cooldown_ok   BOOLEAN     := FALSE;
    v_settlement_hours    INTEGER     := 24;
    v_net_pending_out     NUMERIC     := 0;
    v_effective_float     NUMERIC     := 0;
    v_float_headroom      NUMERIC     := 0;
    v_db_replenish_flag   BOOLEAN     := FALSE;  -- current persisted flag value
    v_alert_fired         BOOLEAN     := FALSE;  -- TRUE only if stamp actually executed
    can_proceed           BOOLEAN;
    reason                TEXT;
BEGIN
    -- ── 1. Lock wallet balance row ────────────────────────────────────────
    SELECT
        wb.wallet_balance,
        wb.user_principal,
        wb.our_profit,
        wb.wallet_float_minimum,
        wb.wallet_float_target,
        wb.last_alert_at,
        wb.replenish_needed
    INTO
        v_wallet_balance,
        v_user_principal,
        v_our_profit,
        v_float_minimum,
        v_float_target,
        v_last_alert_at,
        v_db_replenish_flag
    FROM public.wallet_balance_table wb
    WHERE wb.payment_wallet_id = p_wallet_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'can_proceed',      FALSE,
            'reason',           'No balance record found for wallet',
            'net_available',    0,
            'fw_balance',       p_fw_balance,
            'effective_float',  p_fw_balance,
            'float_headroom',   0,
            'replenish_needed', FALSE,
            'alert_fired',      FALSE,
            'settlement_hours', 24,
            'float_minimum',    0,
            'float_target',     0,
            'required_amount',  p_amount,
            'safe_balance',     0
        );
    END IF;

    -- ── 2. Settlement hours ───────────────────────────────────────────────
    SELECT COALESCE(pw.wallet_settlement_hours, 24)
    INTO v_settlement_hours
    FROM public.payment_wallet_table pw
    WHERE pw.payment_wallet_id = p_wallet_id;

    -- ── 3. Net pending withdrawals ────────────────────────────────────────
    SELECT COALESCE(SUM(ABS(tt.transaction_receiver_amount)), 0)
    INTO v_net_pending_out
    FROM public.transaction_table tt
    JOIN public.payment_profile_table pp
        ON pp.payment_profile_id = tt.payment_profile_receiver_id
    JOIN public.payment_method_table pm
        ON pm.payment_method_id = pp.payment_method_id
    WHERE pm.payment_wallet_id           = p_wallet_id
      AND tt.transaction_type            = 'TransactionType.withdraw'
      AND tt.transaction_receiver_status = 'TransactionStatus.pending';

    -- ── 4. Effective float metrics ────────────────────────────────────────
    v_effective_float  := p_fw_balance - v_net_pending_out;
    v_float_headroom   := v_effective_float - v_float_minimum;
    v_replenish_needed := v_effective_float < v_float_minimum;

    -- ── 5. Can this withdrawal proceed? ──────────────────────────────────
    IF p_fw_balance < p_amount THEN
        can_proceed := FALSE;
        reason := format(
            'FW balance insufficient: available %s (effective %s after %s pending), need %s',
            p_fw_balance, v_effective_float, v_net_pending_out, p_amount
        );
    ELSE
        can_proceed := TRUE;
        reason      := NULL;
    END IF;

    -- ── 6. Replenish flag + alert stamp ───────────────────────────────────
    IF v_replenish_needed THEN
        -- Float is below minimum — check cooldown before stamping alert
        v_alert_cooldown_ok := (
            v_last_alert_at IS NULL
            OR v_last_alert_at < NOW() - INTERVAL '15 minutes'
        );

        IF v_alert_cooldown_ok THEN
            -- Stamp alert: set flag + update timestamp
            UPDATE public.wallet_balance_table
               SET replenish_needed = TRUE,
                   last_alert_at   = NOW(),
                   updated_at      = NOW()
             WHERE payment_wallet_id = p_wallet_id;

            v_alert_fired := TRUE;
        ELSE
            -- Cooldown active — ensure flag is set but don't bump last_alert_at
            IF NOT v_db_replenish_flag THEN
                UPDATE public.wallet_balance_table
                   SET replenish_needed = TRUE,
                       updated_at      = NOW()
                 WHERE payment_wallet_id = p_wallet_id;
            END IF;

            v_alert_fired := FALSE;
        END IF;

    ELSE
        -- Float is healthy — clear the flag if it was previously set
        IF v_db_replenish_flag THEN
            UPDATE public.wallet_balance_table
               SET replenish_needed = FALSE,
                   updated_at      = NOW()
             WHERE payment_wallet_id = p_wallet_id;
        END IF;

        v_alert_fired := FALSE;
    END IF;

    RETURN jsonb_build_object(
        'can_proceed',      can_proceed,
        'reason',           reason,
        'net_available',    v_wallet_balance,
        'user_principal',   v_user_principal,
        'our_profit',       v_our_profit,
        'fw_balance',       p_fw_balance,
        'effective_float',  v_effective_float,
        'net_pending_out',  v_net_pending_out,
        'float_headroom',   v_float_headroom,
        'replenish_needed', v_replenish_needed,
        'alert_fired',      v_alert_fired,        -- TRUE only when stamp actually ran
        'settlement_hours', v_settlement_hours,
        'float_minimum',    v_float_minimum,
        'float_target',     v_float_target,
        'required_amount',  p_amount,
        'safe_balance',     LEAST(v_wallet_balance, p_fw_balance)
    );
END;
$function$

