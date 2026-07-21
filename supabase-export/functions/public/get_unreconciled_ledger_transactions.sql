-- schema:   public
-- function: get_unreconciled_ledger_transactions(p_limit integer, p_max_retries integer)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_unreconciled_ledger_transactions(p_limit integer DEFAULT 50, p_max_retries integer DEFAULT 5)
 RETURNS TABLE(transaction_id uuid, transaction_type text, transaction_amount numeric, transaction_external_id text, currency text, ledger_status text, ledger_retries smallint, confirmed_at timestamp with time zone)
 LANGUAGE sql
 STABLE
AS $function$
    SELECT
        t.transaction_id,
        t.transaction_type,
        CASE
            WHEN t.transaction_type = 'TransactionType.top_up'   THEN t.transaction_sender_amount
            WHEN t.transaction_type = 'TransactionType.withdraw' THEN t.transaction_receiver_amount
        END                           AS transaction_amount,
        t.transaction_external_id,
        w.payment_wallet_currency     AS currency,
        t.transaction_ledger_status   AS ledger_status,
        t.transaction_ledger_retries  AS ledger_retries,
        t.transaction_updated_at      AS confirmed_at
    FROM transaction_table t
    LEFT JOIN payment_profile_table sp ON sp.payment_profile_id = t.payment_profile_sender_id
    LEFT JOIN payment_method_table  sm ON sm.payment_method_id  = sp.payment_method_id
    LEFT JOIN payment_wallet_table  w  ON w.payment_wallet_id   = sm.payment_wallet_id
    WHERE t.transaction_ledger_status IN ('pending', 'failed')
      AND t.transaction_type IN (
            'TransactionType.top_up',
            'TransactionType.withdraw'
          )
      AND t.transaction_ledger_retries < p_max_retries
      -- Skip failed transactions — no ledger entry should exist for these
      AND t.transaction_sender_status   <> 'TransactionStatus.failed'
      AND t.transaction_receiver_status <> 'TransactionStatus.failed'
    ORDER BY t.transaction_updated_at ASC
    LIMIT p_limit;
$function$

