-- schema:   public
-- function: get_refreshed_transaction(p_transaction_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_refreshed_transaction(p_transaction_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    reference            TEXT;
    amount               NUMERIC;
    time_out             INT;
    sender_time_out      INT;
    receiver_time_out    INT;
    v_external_id        TEXT;
    v_sender_status      TEXT;
    v_receiver_status    TEXT;
    v_sender_reference   TEXT;
    v_receiver_reference TEXT;
    v_sender_amount      NUMERIC;
    v_receiver_amount    NUMERIC;
    v_transaction_type   TEXT;
    v_retry_status       BOOLEAN;
    v_hash_key           TEXT;
BEGIN
    IF p_transaction_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT
        tt.transaction_external_id,
        tt.transaction_sender_status,
        tt.transaction_receiver_status,
        tt.transaction_sender_reference,
        tt.transaction_receiver_reference,
        tt.transaction_sender_amount,
        tt.transaction_receiver_amount,
        tt.transaction_type,
        tt.transaction_retry_status,
        tt.transaction_security_hash_key,
        spmt.payment_method_time_out,
        rpmt.payment_method_time_out
    INTO
        v_external_id,
        v_sender_status,
        v_receiver_status,
        v_sender_reference,
        v_receiver_reference,
        v_sender_amount,
        v_receiver_amount,
        v_transaction_type,
        v_retry_status,
        v_hash_key,
        sender_time_out,
        receiver_time_out
    FROM transaction_table tt
    LEFT JOIN payment_profile_table sppt ON sppt.payment_profile_id = tt.payment_profile_sender_id
    LEFT JOIN payment_method_table  spmt ON spmt.payment_method_id  = sppt.payment_method_id
    LEFT JOIN payment_profile_table rppt ON rppt.payment_profile_id = tt.payment_profile_receiver_id
    LEFT JOIN payment_method_table  rpmt ON rpmt.payment_method_id  = rppt.payment_method_id
    WHERE tt.transaction_id = p_transaction_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    CASE v_transaction_type
        WHEN 'TransactionType.top_up' THEN
            reference := v_sender_reference;
            amount    := v_sender_amount;
            time_out  := sender_time_out;
        WHEN 'TransactionType.withdraw' THEN
            reference := v_receiver_reference;
            amount    := v_receiver_amount;
            time_out  := receiver_time_out;
        ELSE
            RETURN NULL;
    END CASE;

    RETURN jsonb_build_object(
        'transaction_id',              p_transaction_id,
        'external_id',                 v_external_id,
        'amount',                      amount,
        'reference',                   reference,
        'transaction_sender_status',   v_sender_status,
        'transaction_receiver_status', v_receiver_status,
        'transaction_retry_status',    v_retry_status,
        'transaction_security_hash_key', v_hash_key,
        'time_out',                    time_out
    );
END;
$function$

