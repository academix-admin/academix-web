-- schema:   public
-- function: get_transaction_flutterwave_method(p_transaction_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_transaction_flutterwave_method(p_transaction_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_type           TEXT;
    v_method_checker TEXT;
    v_currency       TEXT;
    v_wallet_id      UUID;
    v_fw_method      JSONB;
BEGIN
    SELECT
        t.transaction_type,
        CASE
            WHEN t.transaction_type = 'TransactionType.top_up'
                THEN sm.payment_method_checker
            WHEN t.transaction_type = 'TransactionType.withdraw'
                THEN rm.payment_method_checker
        END,
        CASE
            WHEN t.transaction_type = 'TransactionType.top_up'
                THEN sw.payment_wallet_currency
            WHEN t.transaction_type = 'TransactionType.withdraw'
                THEN rw.payment_wallet_currency
        END,
        CASE
            WHEN t.transaction_type = 'TransactionType.top_up'
                THEN sw.payment_wallet_id
            WHEN t.transaction_type = 'TransactionType.withdraw'
                THEN rw.payment_wallet_id
        END
    INTO v_type, v_method_checker, v_currency, v_wallet_id
    FROM transaction_table t
    JOIN payment_profile_table sp ON sp.payment_profile_id = t.payment_profile_sender_id
    JOIN payment_method_table  sm ON sm.payment_method_id  = sp.payment_method_id
    JOIN payment_wallet_table  sw ON sw.payment_wallet_id  = sm.payment_wallet_id
    JOIN payment_profile_table rp ON rp.payment_profile_id = t.payment_profile_receiver_id
    JOIN payment_method_table  rm ON rm.payment_method_id  = rp.payment_method_id
    JOIN payment_wallet_table  rw ON rw.payment_wallet_id  = rm.payment_wallet_id
    WHERE t.transaction_id = p_transaction_id
      AND t.transaction_type IN ('TransactionType.top_up', 'TransactionType.withdraw');

    IF NOT FOUND THEN RETURN NULL; END IF;

    v_fw_method := resolve_flutterwave_method(v_method_checker);
    IF v_fw_method IS NULL THEN RETURN NULL; END IF;

    RETURN jsonb_build_object(
        'collection_method', v_fw_method->>'collection_method',
        'transfer_type',     v_fw_method->>'transfer_type',
        'method_checker',    v_method_checker,
        'currency',          v_currency,
        'wallet_id',         v_wallet_id
    );
END;
$function$

