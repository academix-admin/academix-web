-- schema:   public
-- function: _ledger_mark_failed(p_transaction_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public._ledger_mark_failed(p_transaction_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE transaction_table
       SET transaction_ledger_status  = 'failed',
           transaction_ledger_retries = transaction_ledger_retries + 1
     WHERE transaction_id = p_transaction_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '_ledger_mark_failed error for %: %', p_transaction_id, SQLERRM;
END;
$function$

