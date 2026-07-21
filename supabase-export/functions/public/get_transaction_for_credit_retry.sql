-- schema:   public
-- function: get_transaction_for_credit_retry(p_transaction_id uuid, p_hash_key text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_transaction_for_credit_retry(p_transaction_id uuid, p_hash_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_row      RECORD;
    v_profile  JSONB;
BEGIN
    -- Lock only the inner-joined tables — FOR UPDATE cannot be applied to
    -- the nullable side of an outer join, so pdt is fetched separately below.
    SELECT
        tt.transaction_id,
        tt.transaction_security_hash_key,
        tt.transaction_type,
        ABS(tt.transaction_receiver_amount) AS transfer_amount,
        tt.transaction_receiver_reference   AS transfer_reference,
        pm.payment_method_checker           AS transfer_method,
        pm.payment_method_time_out          AS transfer_time_out,
        pw.payment_wallet_currency          AS transfer_currency,
        pw.payment_wallet_id                AS wallet_id,
        pp.payment_details_id               AS details_id
    INTO v_row
    FROM   transaction_table     tt
    JOIN   payment_profile_table pp  ON pp.payment_profile_id = tt.payment_profile_receiver_id
    JOIN   payment_method_table  pm  ON pm.payment_method_id  = pp.payment_method_id
    JOIN   payment_wallet_table  pw  ON pw.payment_wallet_id  = pm.payment_wallet_id
    WHERE  tt.transaction_id              = p_transaction_id
      AND  tt.transaction_type            = 'TransactionType.withdraw'
      AND  tt.transaction_retry_status    = TRUE
      AND  tt.transaction_sender_status   = 'TransactionStatus.pending'
      AND  tt.transaction_receiver_status = 'TransactionStatus.pending'
    FOR UPDATE OF tt;       -- lock only transaction_table, not the joined tables

    IF NOT FOUND THEN
        RAISE NOTICE 'get_transaction_for_credit_retry: row not found or not eligible for %', p_transaction_id;
        RETURN jsonb_build_object('error', 1);
    END IF;

    -- Hash mismatch — reject without nulling the key
    IF v_row.transaction_security_hash_key IS DISTINCT FROM p_hash_key THEN
        RAISE NOTICE 'get_transaction_for_credit_retry: hash mismatch for %', p_transaction_id;
        RETURN jsonb_build_object('error', 2);
    END IF;

    -- Fetch payment details separately now that the lock is held —
    -- LEFT JOIN is safe here because we are not inside FOR UPDATE.
    SELECT to_jsonb(pdt) - 'payment_details_id'
    INTO   v_profile
    FROM   payment_details_table pdt
    WHERE  pdt.payment_details_id = v_row.details_id;

    -- Consume the hash (one-time use)
    UPDATE transaction_table
       SET transaction_security_hash_key = NULL,
           transaction_updated_at        = NOW()
     WHERE transaction_id = p_transaction_id;

    RETURN jsonb_build_object(
        'transfer_amount',    v_row.transfer_amount,
        'transfer_currency',  v_row.transfer_currency,
        'transfer_reference', v_row.transfer_reference,
        'transfer_method',    v_row.transfer_method,
        'transfer_type',      v_row.transaction_type,
        'transfer_time_out',  v_row.transfer_time_out,
        'wallet_id',          v_row.wallet_id,
        'transfer_profile',   v_profile
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'get_transaction_for_credit_retry error for %: %', p_transaction_id, SQLERRM;
        RETURN jsonb_build_object('error', SQLERRM);
END;
$function$

