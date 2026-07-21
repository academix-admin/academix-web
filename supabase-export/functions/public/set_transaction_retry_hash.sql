-- schema:   public
-- function: set_transaction_retry_hash(p_transaction_id uuid, p_hash_key text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.set_transaction_retry_hash(p_transaction_id uuid, p_hash_key text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE transaction_table
       SET transaction_security_hash_key = p_hash_key,
           transaction_updated_at        = NOW()
     WHERE transaction_id                 = p_transaction_id
       AND transaction_retry_status       = TRUE
       AND transaction_sender_status      = 'TransactionStatus.pending'
       AND transaction_receiver_status    = 'TransactionStatus.pending'
       AND transaction_type               = 'TransactionType.withdraw';

    -- Returns TRUE only if the row was actually updated (eligible row found)
    RETURN FOUND;
END;
$function$

