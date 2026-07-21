-- schema:   public
-- function: update_user_balance()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.update_user_balance()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    profile_id          UUID;
    user_id             UUID;
    type                TEXT;
    s_status            TEXT;
    r_status            TEXT;
    amount              NUMERIC;
    old_balance         NUMERIC := 0;
    new_balance         NUMERIC;
    operation           TEXT;
    event               TEXT := TG_OP;
    status_change       BOOLEAN;
    old_block_time      TIMESTAMPTZ;
    referral_block_time TIMESTAMPTZ;
    should_write_ledger BOOLEAN := FALSE;
    v_txn_id            UUID;
BEGIN
    -- ── Recursion guard ──────────────────────────────────────────────────────
    IF pg_trigger_depth() > 1
       AND TG_OP = 'UPDATE'
       AND NEW.transaction_balance_written = TRUE
       AND OLD.transaction_balance_written = FALSE
    THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    v_txn_id := COALESCE(NEW.transaction_id, OLD.transaction_id);

    -- ── Resolve transaction context ──────────────────────────────────────────
    type     := CASE WHEN event = 'DELETE' THEN OLD.transaction_type
                     ELSE COALESCE(NEW.transaction_type, OLD.transaction_type) END;
    s_status := CASE WHEN event = 'DELETE' THEN OLD.transaction_sender_status
                     ELSE COALESCE(NEW.transaction_sender_status, OLD.transaction_sender_status) END;
    r_status := CASE WHEN event = 'DELETE' THEN OLD.transaction_receiver_status
                     ELSE COALESCE(NEW.transaction_receiver_status, OLD.transaction_receiver_status) END;

    profile_id := CASE
        WHEN type = 'TransactionType.participation' THEN
            COALESCE(OLD.payment_profile_receiver_id, NEW.payment_profile_receiver_id)
        WHEN type IN (
            'TransactionType.top_up',
            'TransactionType.buy_in',
            'TransactionType.withdraw',
            'TransactionType.quiz'
        ) THEN
            COALESCE(OLD.payment_profile_sender_id, NEW.payment_profile_sender_id)
        ELSE NULL
    END;

    IF profile_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

    SELECT ppt.users_id INTO user_id
    FROM   payment_profile_table ppt
    WHERE  payment_profile_id = profile_id;

    IF user_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

    -- ── Status-change detection ──────────────────────────────────────────────
    IF TG_OP = 'UPDATE' THEN
        IF type IN ('TransactionType.top_up', 'TransactionType.buy_in')
           AND NEW.transaction_sender_status IS DISTINCT FROM OLD.transaction_sender_status
        THEN
            status_change := TRUE;
        ELSIF type IN ('TransactionType.withdraw', 'TransactionType.quiz', 'TransactionType.participation')
           AND NEW.transaction_receiver_status IS DISTINCT FROM OLD.transaction_receiver_status
        THEN
            status_change := TRUE;
        ELSE
            status_change := FALSE;
        END IF;
    ELSE
        status_change := TRUE;
    END IF;

    IF status_change = FALSE THEN RETURN COALESCE(NEW, OLD); END IF;

    -- ── Resolve amount ───────────────────────────────────────────────────────
    amount := CASE
        WHEN type IN ('TransactionType.top_up', 'TransactionType.buy_in') AND event <> 'DELETE' THEN
            COALESCE(NEW.transaction_receiver_amount, OLD.transaction_receiver_amount)
        WHEN type = 'TransactionType.participation' AND event <> 'DELETE' THEN
            COALESCE(NEW.transaction_receiver_amount, OLD.transaction_receiver_amount)
        WHEN type IN ('TransactionType.withdraw', 'TransactionType.quiz') THEN
            CASE WHEN event = 'DELETE' THEN OLD.transaction_sender_amount
                 ELSE COALESCE(NEW.transaction_sender_amount, OLD.transaction_sender_amount)
            END
        ELSE NULL
    END;

    IF amount IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

    -- ── Resolve balance operation ────────────────────────────────────────────
    operation := CASE
        WHEN type = 'TransactionType.top_up'
             AND s_status = 'TransactionStatus.success' AND event = 'UPDATE'  THEN '+'
        WHEN type = 'TransactionType.withdraw'
             AND r_status = 'TransactionStatus.pending' AND event = 'INSERT'  THEN '-'
        WHEN type = 'TransactionType.withdraw'
             AND r_status = 'TransactionStatus.failed'  AND event = 'UPDATE'  THEN '+'
        WHEN type = 'TransactionType.quiz'
             AND r_status = 'TransactionStatus.pending' AND event = 'INSERT'  THEN '-'
        WHEN type = 'TransactionType.quiz'
             AND r_status = 'TransactionStatus.pending' AND event = 'DELETE'  THEN '+'
        WHEN type = 'TransactionType.participation'
             AND r_status = 'TransactionStatus.success' AND event = 'INSERT'  THEN '+'
        ELSE NULL
    END;

    -- ── Branch A: balance operation exists ───────────────────────────────────
    IF operation IS NOT NULL THEN

        INSERT INTO personal.users_balance_table (users_id, users_balance_amount)
        VALUES (user_id, 0)
        ON CONFLICT (users_id) DO NOTHING;

        SELECT COALESCE(ubt.users_balance_amount, 0), ubt.users_balance_referral_block
        INTO   old_balance, old_block_time
        FROM   personal.users_balance_table ubt
        WHERE  ubt.users_id = user_id
        FOR UPDATE;

        new_balance := CASE
            WHEN operation = '+' THEN old_balance + ABS(amount)
            WHEN operation = '-' THEN old_balance - ABS(amount)
            ELSE old_balance
        END;

        IF new_balance < 0 THEN
            RAISE NOTICE 'update_user_balance: insufficient balance for user % (has %, needs %)',
                user_id, old_balance, ABS(amount);
            RETURN COALESCE(NEW, OLD);
        END IF;

        BEGIN
            SELECT * INTO referral_block_time
            FROM handle_referral_payment(user_id, ABS(amount), type, s_status);
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'update_user_balance: referral payment failed for %: %', v_txn_id, SQLERRM;
                referral_block_time := NULL;
        END;

        IF referral_block_time IS NULL THEN
            INSERT INTO personal.users_balance_table (users_id, users_balance_amount)
            VALUES (user_id, new_balance)
            ON CONFLICT (users_id)
            DO UPDATE SET users_balance_amount = EXCLUDED.users_balance_amount;
        ELSE
            INSERT INTO personal.users_balance_table (
                users_id, users_balance_amount, users_balance_referral_block
            ) VALUES (user_id, new_balance, referral_block_time)
            ON CONFLICT (users_id)
            DO UPDATE SET
                users_balance_amount         = EXCLUDED.users_balance_amount,
                users_balance_referral_block = EXCLUDED.users_balance_referral_block;
        END IF;

        -- Ledger: top_up
        IF type = 'TransactionType.top_up'
           AND event = 'UPDATE'
           AND s_status = 'TransactionStatus.success'
           AND OLD.transaction_sender_status = 'TransactionStatus.pending'
        THEN
            should_write_ledger := TRUE;
        END IF;

    -- ── Branch B: no balance operation (buy_in, quiz success, etc.) ──────────
    ELSE

        INSERT INTO personal.users_balance_table (users_id, users_balance_amount)
        VALUES (user_id, 0)
        ON CONFLICT (users_id) DO NOTHING;

        SELECT ubt.users_balance_referral_block
        INTO   old_block_time
        FROM   personal.users_balance_table ubt
        WHERE  ubt.users_id = user_id;

        -- Remove referral block when a quiz completes successfully
        IF old_block_time IS NOT NULL
           AND type = 'TransactionType.quiz'
           AND r_status = 'TransactionStatus.success'
           AND ABS(amount) > 0
        THEN
            INSERT INTO personal.users_balance_table (users_id, users_balance_referral_block)
            VALUES (user_id, NULL)
            ON CONFLICT (users_id)
            DO UPDATE SET users_balance_referral_block = EXCLUDED.users_balance_referral_block;
        END IF;


        -- Ledger: withdraw
        IF type = 'TransactionType.withdraw'
           AND event = 'UPDATE'
           AND r_status = 'TransactionStatus.success'
           AND OLD.transaction_receiver_status = 'TransactionStatus.pending'
        THEN
            should_write_ledger := TRUE;
        END IF;

        -- buy_in: stamp transaction_id on INSERT, activate + write ledger on UPDATE
        IF type = 'TransactionType.buy_in'
           AND event IN ('INSERT', 'UPDATE')
        THEN
            IF event = 'UPDATE' 
            AND s_status = 'TransactionStatus.success'
            AND OLD.transaction_sender_status  = 'TransactionStatus.pending' THEN
                should_write_ledger := TRUE;
            END IF;

            BEGIN
                PERFORM activate_user_account(
                    user_id,
                    v_txn_id,
                    ABS(amount),
                    type,
                    s_status
                );
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'update_user_balance: activate_user_account failed for %: %',
                        v_txn_id, SQLERRM;
            END;
        END IF;

    END IF;

    -- ── Write ledger ─────────────────────────────────────────────────────────
    IF should_write_ledger THEN
        BEGIN
            PERFORM write_wallet_ledger_entry(v_txn_id);
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'update_user_balance: ledger write failed for %: %',
                    v_txn_id, SQLERRM;
        END;
    END IF;

    -- ── Idempotency stamp ────────────────────────────────────────────────────
    UPDATE transaction_table
    SET
        transaction_balance_written = TRUE,
        transaction_updated_at      = NOW()
    WHERE transaction_id              = v_txn_id
      AND transaction_balance_written = FALSE;

    RETURN COALESCE(NEW, OLD);

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'update_user_balance error for %: %', v_txn_id, SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$function$

