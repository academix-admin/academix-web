-- schema:   public
-- function: update_user_payment(event text, amount numeric, currency text, status text, reference text, id text, service text, fw_fee numeric)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.update_user_payment(event text, amount numeric, currency text, status text, reference text, id text DEFAULT NULL::text, service text DEFAULT NULL::text, fw_fee numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    verify_amount       BOOLEAN := FALSE;
    type                TEXT;
    old_id              UUID;
    sender_amount       NUMERIC;
    sender_fee          NUMERIC;
    receiver_amount     NUMERIC;
    expected_amount     NUMERIC;
    sender_status       TEXT;
    receiver_status     TEXT;
    new_sender_status   TEXT;
    new_receiver_status TEXT;
    is_fiat_transaction BOOLEAN;
BEGIN
    IF amount IS NULL OR amount <= 0
       OR event IS NULL OR currency IS NULL
       OR status IS NULL OR reference IS NULL
       OR (id IS NULL AND (status <> 'FAILED' AND status <> 'RETRY'))
    THEN
        RETURN NULL;
    END IF;

    -- ── Resolve the row by reference ─────────────────────────────────────────
    IF substring(reference, 1, 3) = 'ADC' THEN
        SELECT transaction_id, transaction_type,
               transaction_sender_amount, transaction_fee, transaction_receiver_amount,
               transaction_sender_status, transaction_receiver_status
        INTO   old_id, type,
               sender_amount, sender_fee, receiver_amount,
               sender_status, receiver_status
        FROM   transaction_table
        WHERE  transaction_sender_reference = reference
        FOR UPDATE;

    ELSIF substring(reference, 1, 3) = 'REF' THEN
        SELECT transaction_id, transaction_type,
               transaction_sender_amount, transaction_receiver_amount,
               transaction_sender_status, transaction_receiver_status
        INTO   old_id, type,
               sender_amount, receiver_amount,
               sender_status, receiver_status
        FROM   transaction_table
        WHERE  transaction_receiver_reference = reference
        FOR UPDATE;

    ELSE
        RETURN NULL;
    END IF;

    IF old_id IS NULL OR type IS NULL THEN RETURN NULL; END IF;

    -- ── RETRY: stamp flag and return — skip amount verification entirely ──────
    -- The row must still be pending on both sides; if it's already been
    -- resolved (success or failed) a retry stamp makes no sense.
    IF status = 'RETRY' THEN
        IF sender_status <> 'TransactionStatus.pending'
           OR receiver_status <> 'TransactionStatus.pending'
        THEN
            RETURN NULL;
        END IF;

        UPDATE transaction_table
           SET transaction_retry_status = TRUE,
               transaction_updated_at   = now()
         WHERE transaction_id = old_id;

        RETURN jsonb_build_object(
            'transaction_id',              old_id,
            'transaction_receiver_status', receiver_status,
            'transaction_sender_status',   sender_status
        );
    END IF;

    -- ── Amount verification (FAILED and SUCCESSFUL paths) ────────────────────
    IF type = 'TransactionType.top_up' THEN
        expected_amount := sender_amount + sender_fee;
    ELSIF type = 'TransactionType.withdraw' THEN
        expected_amount := receiver_amount;
    ELSIF type = 'TransactionType.buy_in' THEN
        expected_amount := sender_amount + sender_fee;
    ELSE
        -- quiz / participation / unknown — no external payment amount to verify
        expected_amount := amount;
    END IF;

    verify_amount := (amount BETWEEN (expected_amount - 1) AND expected_amount)
        AND sender_status   = 'TransactionStatus.pending'
        AND receiver_status = 'TransactionStatus.pending';

    IF NOT verify_amount THEN RETURN NULL; END IF;

    -- ── Resolve new statuses ─────────────────────────────────────────────────
    IF status = 'SUCCESSFUL' THEN
        new_sender_status   := 'TransactionStatus.success';
        new_receiver_status := 'TransactionStatus.success';
    ELSIF status = 'FAILED' THEN
        new_sender_status   := 'TransactionStatus.failed';
        new_receiver_status := 'TransactionStatus.failed';
    ELSE
        RETURN NULL;
    END IF;

    is_fiat_transaction := type IN (
        'TransactionType.top_up',
        'TransactionType.withdraw',
        'TransactionType.buy_in'
    );

    UPDATE transaction_table
       SET transaction_receiver_status = new_receiver_status,
           transaction_sender_status   = new_sender_status,
           transaction_external_id     = id,
           transaction_service         = service,
           transaction_updated_at      = now(),
           transaction_retry_status    = FALSE,
           transaction_external_fee    = COALESCE(fw_fee, transaction_external_fee),
           transaction_ledger_status   = CASE
               WHEN status = 'SUCCESSFUL' AND is_fiat_transaction THEN 'pending'
               ELSE NULL
           END
     WHERE transaction_id = old_id;

    RETURN jsonb_build_object(
        'transaction_id',              old_id,
        'transaction_receiver_status', new_receiver_status,
        'transaction_sender_status',   new_sender_status
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Payment Update Error: %', SQLERRM;
        RETURN NULL;
END;
$function$

