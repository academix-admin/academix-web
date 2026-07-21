-- schema:   public
-- function: write_wallet_ledger_entry(p_transaction_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.write_wallet_ledger_entry(p_transaction_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_type              TEXT;
    v_t_fee             NUMERIC;
    v_e_fee             NUMERIC;
    v_sender_amount     NUMERIC;
    v_receiver_amount   NUMERIC;
    v_rate              NUMERIC;
    v_ledger_status     TEXT;
    v_pools_id          UUID;
 
    v_fiat_wallet_id    UUID;
    v_fiat_currency     TEXT;
    v_fiat_checker      TEXT;
    v_adc_wallet_id     UUID;
 
    v_fiat_amount       NUMERIC;
    v_adc_amount        NUMERIC;
    v_profit            NUMERIC;
 
BEGIN
    -- ── [0] Resolve ADC wallet ────────────────────────────────────────────────
    --  The ADC wallet is the platform's internal treasury wallet.
    --  Every fiat operation needs a mirrored ADC row on this wallet.
    v_adc_wallet_id := public.get_adc_wallet_id();
 
    IF v_adc_wallet_id IS NULL THEN
        RAISE NOTICE 'write_wallet_ledger_entry: ADC wallet not found for %', p_transaction_id;
        PERFORM public._ledger_mark_failed(p_transaction_id);
        RETURN;
    END IF;
 
    -- ── [1] Load and lock transaction ─────────────────────────────────────────
    SELECT
        t.transaction_type,
        t.transaction_fee,
        t.transaction_external_fee,
        t.transaction_sender_amount,
        t.transaction_receiver_amount,
        t.transaction_sender_rate,
        t.transaction_ledger_status,
        t.pools_id
    INTO
        v_type,
        v_t_fee,
        v_e_fee,
        v_sender_amount,
        v_receiver_amount,
        v_rate,
        v_ledger_status,
        v_pools_id
    FROM transaction_table t
    WHERE t.transaction_id = p_transaction_id
    FOR UPDATE;
 
    IF NOT FOUND THEN
        RAISE NOTICE 'write_wallet_ledger_entry: transaction % not found', p_transaction_id;
        RETURN;
    END IF;
 
    -- ── [2] Idempotency guard ─────────────────────────────────────────────────
    --  If we've already written this transaction, skip to avoid double-counting.
    IF v_ledger_status = 'written' THEN
        RAISE NOTICE 'write_wallet_ledger_entry: % already written — skipping', p_transaction_id;
        RETURN;
    END IF;
 
    -- ── [3] Only top_up, withdraw, and buy_in touch the ledger ───────────────
    IF v_type NOT IN ('TransactionType.top_up', 'TransactionType.withdraw', 'TransactionType.buy_in') THEN
        RETURN;
    END IF;
 
    -- ── [4] Resolve fiat wallet ───────────────────────────────────────────────
    --  For top_up / buy_in: fiat comes FROM the sender's wallet.
    --  For withdraw:        fiat goes  TO  the receiver's wallet.
    SELECT
        CASE WHEN v_type IN ('TransactionType.top_up', 'TransactionType.buy_in')
             THEN sw.payment_wallet_id
             ELSE rw.payment_wallet_id END,
        CASE WHEN v_type IN ('TransactionType.top_up', 'TransactionType.buy_in')
             THEN sw.payment_wallet_currency
             ELSE rw.payment_wallet_currency END,
        CASE WHEN v_type IN ('TransactionType.top_up', 'TransactionType.buy_in')
             THEN sm.payment_method_checker
             ELSE rm.payment_method_checker END
    INTO v_fiat_wallet_id, v_fiat_currency, v_fiat_checker
    FROM transaction_table t
    LEFT JOIN payment_profile_table sp ON sp.payment_profile_id = t.payment_profile_sender_id
    LEFT JOIN payment_method_table  sm ON sm.payment_method_id  = sp.payment_method_id
    LEFT JOIN payment_wallet_table  sw ON sw.payment_wallet_id  = sm.payment_wallet_id
    LEFT JOIN payment_profile_table rp ON rp.payment_profile_id = t.payment_profile_receiver_id
    LEFT JOIN payment_method_table  rm ON rm.payment_method_id  = rp.payment_method_id
    LEFT JOIN payment_wallet_table  rw ON rw.payment_wallet_id  = rm.payment_wallet_id
    WHERE t.transaction_id = p_transaction_id;
 
    IF v_fiat_wallet_id IS NULL OR v_fiat_currency IS NULL THEN
        RAISE NOTICE 'write_wallet_ledger_entry: could not resolve fiat wallet for %', p_transaction_id;
        PERFORM public._ledger_mark_failed(p_transaction_id);
        RETURN;
    END IF;
 
    -- ── [5] Derive amounts ────────────────────────────────────────────────────
    --
    --  top_up:
    --    v_fiat_amount = fiat the user sent in
    --    v_adc_amount  = ADC the user received
    --    v_profit      = our transaction fee minus the external (FW) fee — in fiat
    --
    --  buy_in:
    --    v_fiat_amount = fiat the user paid into the pool
    --    (no v_adc_amount — no ADC is issued to the user)
    --    v_profit      = our fee margin — in fiat
    --
    --  withdraw:
    --    v_fiat_amount = fiat the user receives out
    --    v_adc_amount  = ADC principal being burned (sender_amount minus our fee)
    --    v_profit      = fee converted to fiat minus external fee — in fiat
    --
    IF v_type = 'TransactionType.top_up' THEN
        v_fiat_amount := ABS(v_sender_amount);
        v_adc_amount  := ABS(v_receiver_amount);
        v_e_fee       := COALESCE(v_e_fee, 0);
        v_profit      := v_t_fee - v_e_fee;
 
    ELSIF v_type = 'TransactionType.buy_in' THEN
        v_fiat_amount := ABS(v_sender_amount);
        v_e_fee       := COALESCE(v_e_fee, 0);
        v_profit      := v_t_fee - v_e_fee;
 
    ELSIF v_type = 'TransactionType.withdraw' THEN
        v_fiat_amount := ABS(v_receiver_amount);
        v_adc_amount  := ABS(v_sender_amount) - v_t_fee;
        v_e_fee       := COALESCE(v_e_fee, 0);
        v_profit      := (v_t_fee / NULLIF(v_rate, 0)) - v_e_fee;
    END IF;
 
    -- ── [6] Write ledger rows ─────────────────────────────────────────────────
 
    IF v_type = 'TransactionType.top_up' THEN
        -- ────────────────────────────────────────────────────────────────────
        --  TOP_UP — user sends fiat, receives ADC
        --
        --  Balance effect:
        --    fiat wallet  principal  +fiat_amount   (platform now owes user this fiat)
        --    ADC  wallet  principal  +adc_amount    (platform now owes user this ADC)
        --    fiat wallet  profit     +v_profit       (platform earns fee margin in fiat)
        --    ADC  wallet  profit     +v_profit/rate  (ADC mirror of that fee margin)
        -- ────────────────────────────────────────────────────────────────────
 
        -- ROW 1: fiat inflow — increases user_principal on fiat wallet
        INSERT INTO wallet_ledger_table (
            payment_wallet_id, transaction_id, transaction_type,
            gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
            adc_amount, exchange_rate, currency,
            method_checker, pools_id
        ) VALUES (
            v_fiat_wallet_id, p_transaction_id, 'top_up',
            v_fiat_amount, v_fiat_amount, v_e_fee, 0,
            v_adc_amount, v_rate, v_fiat_currency,
            v_fiat_checker, v_pools_id
        );
 
        -- ROW 2: ADC inflow — increases user_principal on ADC wallet
        INSERT INTO wallet_ledger_table (
            payment_wallet_id, transaction_id, transaction_type,
            gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
            adc_amount, exchange_rate, currency,
            method_checker, pools_id
        ) VALUES (
            v_adc_wallet_id, p_transaction_id, 'top_up',
            v_adc_amount, v_adc_amount, 0, 0,
            v_adc_amount, 1, 'ADC',
            v_fiat_checker, v_pools_id
        );
 
        -- ROW 3: fiat profit — increases our_profit on fiat wallet
        --   gross/principal = 0 because this is purely a profit recognition row,
        --   not a new cash movement; the cash already landed in ROW 1.
        INSERT INTO wallet_ledger_table (
            payment_wallet_id, transaction_id, transaction_type,
            gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
            adc_amount, exchange_rate, currency,
            method_checker, pools_id
        ) VALUES (
            v_fiat_wallet_id, p_transaction_id, 'profit',
            0, 0, 0, v_profit,
            0, v_rate, v_fiat_currency,
            v_fiat_checker, v_pools_id
        );
 
        -- ROW 4: ADC profit mirror — increases our_profit on ADC wallet
        --   Converts fiat fee margin to ADC so the ADC wallet reflects the same gain.
        --   adc_amount = 0 because no new ADC is being issued; this is a profit attribution.
        INSERT INTO wallet_ledger_table (
            payment_wallet_id, transaction_id, transaction_type,
            gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
            adc_amount, exchange_rate, currency,
            method_checker, pools_id
        ) VALUES (
            v_adc_wallet_id, p_transaction_id, 'profit',
            0, 0, 0, v_profit / NULLIF(v_rate, 0),
            0, 1, 'ADC',
            v_fiat_checker, v_pools_id
        );
 
    ELSIF v_type = 'TransactionType.buy_in' THEN
        -- ────────────────────────────────────────────────────────────────────
        --  BUY_IN — user pays fiat into a pool; no ADC is issued to the user.
        --  The entire fiat amount is platform revenue (our_profit).
        --  On top of that, the platform also earns a fee margin.
        --
        --  Balance effect:
        --    fiat wallet  profit  +fiat_amount        (inflow is all platform revenue)
        --    fiat wallet  profit  +v_profit            (fee margin on top of inflow)
        --    ADC  wallet  profit  +fiat_amount/rate    (ADC equiv of fiat inflow)
        --    ADC  wallet  profit  +v_profit/rate       (ADC equiv of fee margin)
        --
        --  Note: trigger maps 'buy_in' → profit_delta = gross_amount
        --        and 'profit' → profit_delta = our_profit_amount
        --        so all four rows correctly accumulate into our_profit only.
        -- ────────────────────────────────────────────────────────────────────
 
        -- ROW 1: fiat inflow → entirely platform profit
        --   our_profit_amount = v_fiat_amount signals to the trigger this is all profit.
        INSERT INTO wallet_ledger_table (
            payment_wallet_id, transaction_id, transaction_type,
            gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
            adc_amount, exchange_rate, currency,
            method_checker, pools_id
        ) VALUES (
            v_fiat_wallet_id, p_transaction_id, 'buy_in',
            v_fiat_amount, v_fiat_amount, v_e_fee, v_fiat_amount,
            0, v_rate, v_fiat_currency,
            v_fiat_checker, v_pools_id
        );
 
        -- ROW 2: fiat fee margin profit
        --   Separate profit row so reporting can distinguish base inflow from fee margin.
        INSERT INTO wallet_ledger_table (
            payment_wallet_id, transaction_id, transaction_type,
            gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
            adc_amount, exchange_rate, currency,
            method_checker, pools_id
        ) VALUES (
            v_fiat_wallet_id, p_transaction_id, 'profit',
            0, 0, 0, v_profit,
            0, v_rate, v_fiat_currency,
            v_fiat_checker, v_pools_id
        );
 
        -- ROW 3: ADC equivalent of fiat inflow → ADC wallet profit
        --   Converts the fiat inflow to ADC so the ADC wallet balance stays in sync.
        --   gross = principal = our_profit = fiat_amount/rate (all profit, no user liability).
        INSERT INTO wallet_ledger_table (
            payment_wallet_id, transaction_id, transaction_type,
            gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
            adc_amount, exchange_rate, currency,
            method_checker, pools_id
        ) VALUES (
            v_adc_wallet_id, p_transaction_id, 'buy_in',
            v_fiat_amount / NULLIF(v_rate, 0),
            v_fiat_amount / NULLIF(v_rate, 0),
            v_e_fee       / NULLIF(v_rate, 0),
            v_fiat_amount / NULLIF(v_rate, 0),
            v_fiat_amount / NULLIF(v_rate, 0),
            1, 'ADC',
            v_fiat_checker, v_pools_id
        );
 
        -- ROW 4: ADC equivalent of fee margin profit
        --   Mirrors ROW 2 on the ADC wallet.
        INSERT INTO wallet_ledger_table (
            payment_wallet_id, transaction_id, transaction_type,
            gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
            adc_amount, exchange_rate, currency,
            method_checker, pools_id
        ) VALUES (
            v_adc_wallet_id, p_transaction_id, 'profit',
            0, 0, 0, v_profit / NULLIF(v_rate, 0),
            0, 1, 'ADC',
            v_fiat_checker, v_pools_id
        );
 
    ELSIF v_type = 'TransactionType.withdraw' THEN
        -- ────────────────────────────────────────────────────────────────────
        --  WITHDRAW — user burns ADC, receives fiat
        --
        --  Balance effect:
        --    fiat wallet  principal  -fiat_amount   (platform no longer owes user this fiat)
        --    ADC  wallet  principal  -adc_amount    (platform no longer owes user this ADC)
        --    fiat wallet  profit     +v_profit       (platform earns fee margin in fiat)
        --    ADC  wallet  profit     -v_t_fee        (fee leg: platform pays FW cost from ADC profit)
        --
        --  Note: v_profit for withdraw is already in fiat (= t_fee/rate - e_fee).
        --        v_adc_amount = sender_amount - t_fee (net ADC after fee deduction).
        -- ────────────────────────────────────────────────────────────────────
 
        -- ROW 1: fiat outflow — decreases user_principal on fiat wallet
        INSERT INTO wallet_ledger_table (
            payment_wallet_id, transaction_id, transaction_type,
            gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
            adc_amount, exchange_rate, currency,
            method_checker, pools_id
        ) VALUES (
            v_fiat_wallet_id, p_transaction_id, 'withdraw',
            -v_fiat_amount, -v_fiat_amount, -v_e_fee, 0,
            -v_adc_amount, v_rate, v_fiat_currency,
            v_fiat_checker, v_pools_id
        );
 
        -- ROW 2: ADC principal outflow — decreases user_principal on ADC wallet
        INSERT INTO wallet_ledger_table (
            payment_wallet_id, transaction_id, transaction_type,
            gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
            adc_amount, exchange_rate, currency,
            method_checker, pools_id
        ) VALUES (
            v_adc_wallet_id, p_transaction_id, 'withdraw',
            -v_adc_amount, -v_adc_amount, 0, 0,
            -v_adc_amount, 1, 'ADC',
            v_fiat_checker, v_pools_id
        );
 
        -- ROW 3: fiat profit — increases our_profit on fiat wallet
        --   Platform earns the spread between what the user paid in fees
        --   and what was forwarded to Flutterwave.
        INSERT INTO wallet_ledger_table (
            payment_wallet_id, transaction_id, transaction_type,
            gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
            adc_amount, exchange_rate, currency,
            method_checker, pools_id
        ) VALUES (
            v_fiat_wallet_id, p_transaction_id, 'profit',
            0, 0, 0, v_profit,
            0, v_rate, v_fiat_currency,
            v_fiat_checker, v_pools_id
        );
 
        -- ROW 4: ADC fee leg — decreases our_profit on ADC wallet
        --   The full transaction fee (in ADC) is consumed from the ADC wallet
        --   to cover the cost of the withdrawal. The net margin is captured in ROW 3.
        INSERT INTO wallet_ledger_table (
            payment_wallet_id, transaction_id, transaction_type,
            gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
            adc_amount, exchange_rate, currency,
            method_checker, pools_id
        ) VALUES (
            v_adc_wallet_id, p_transaction_id, 'fee',
            -v_t_fee, -v_t_fee, 0, 0,
            -v_t_fee, v_rate, 'ADC',
            v_fiat_checker, v_pools_id
        );
 
    END IF;
 
    -- ── [7] Mark written ──────────────────────────────────────────────────────
    UPDATE transaction_table
       SET transaction_ledger_status = 'written'
     WHERE transaction_id = p_transaction_id;
 
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'write_wallet_ledger_entry error for %: %', p_transaction_id, SQLERRM;
        PERFORM public._ledger_mark_failed(p_transaction_id);
END;
$function$

