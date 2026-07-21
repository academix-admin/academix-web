-- schema:   public
-- function: delete_pool_quiz(p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.delete_pool_quiz(p_pool_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    redeemable_ids UUID[];
    transaction_ids UUID[];
    question_ids UUID[];
BEGIN

    -- Collect question tracker IDs from question_tracker_table
    SELECT COALESCE(array_agg(qqt.question_tracker_id), '{}')
    INTO question_ids
    FROM question_tracker_table qqt
    LEFT JOIN pools_question_table pqt ON qqt.pools_question_id = pqt.pools_question_id
    WHERE pqt.pools_id = p_pool_id;

    -- Bulk delete from options tracker records
    DELETE FROM option_tracker_table
    WHERE question_tracker_id = ANY(question_ids);    

    -- Bulk delete from question tracker records
    DELETE FROM question_tracker_table
    WHERE question_tracker_id = ANY(question_ids);       

    DELETE FROM pools_question_table WHERE pools_id = p_pool_id;

    -- Collect redeemable and transaction IDs from pools_members_table
    SELECT COALESCE(array_agg(redeemable_id), '{}'), COALESCE(array_agg(transaction_id), '{}')
    INTO redeemable_ids, transaction_ids
    FROM pools_members_table
    WHERE pools_id = p_pool_id;

    -- Bulk delete redeemable records
    DELETE FROM redeemable_table
    WHERE redeemable_id = ANY(redeemable_ids)
      AND redeemable_status = 'RedeemableStatus.pending';

    -- Bulk delete transaction records
    DELETE FROM transaction_table
    WHERE transaction_id = ANY(transaction_ids)
      AND transaction_receiver_status = 'TransactionStatus.pending';

    -- Delete records from pools_members_table
    DELETE FROM pools_members_table WHERE pools_id = p_pool_id;

    -- Finally, delete the pool itself
    DELETE FROM pools_table WHERE pools_id = p_pool_id;

    -- If everything succeeds, return TRUE
    RETURN TRUE;

EXCEPTION 
    WHEN OTHERS THEN
        -- Log the error (you can use RAISE NOTICE or a logging table)
        RAISE NOTICE 'Error deleting pool quiz: %', SQLERRM;
        RETURN FALSE; -- Return FALSE if an error occurs
END;
$function$

