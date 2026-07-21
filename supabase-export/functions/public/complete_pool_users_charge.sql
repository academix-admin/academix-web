-- schema:   public
-- function: complete_pool_users_charge(p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.complete_pool_users_charge(p_pool_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    updated_redeemable INT;
    updated_transactions INT;
BEGIN
    -- Validate input
    IF p_pool_id IS NULL THEN
        RAISE NOTICE 'Invalid input: p_pool_id cannot be NULL.';
        RETURN FALSE;
    END IF;

    -- Update redeemable_table with better performance
    WITH pool_members AS (
        SELECT redeemable_id 
        FROM pools_members_table 
        WHERE pools_id = p_pool_id
          AND redeemable_id IS NOT NULL
    )
    UPDATE redeemable_table 
    SET redeemable_status = 'RedeemableStatus.success' 
    WHERE redeemable_id IN (SELECT redeemable_id FROM pool_members);
    
    GET DIAGNOSTICS updated_redeemable = ROW_COUNT;

    -- Update transaction_table with better performance
    WITH pool_members AS (
        SELECT transaction_id 
        FROM pools_members_table 
        WHERE pools_id = p_pool_id
          AND transaction_id IS NOT NULL
    )
    UPDATE transaction_table 
    SET transaction_receiver_status = 'TransactionStatus.success' 
    WHERE transaction_id IN (SELECT transaction_id FROM pool_members);
    
    GET DIAGNOSTICS updated_transactions = ROW_COUNT;

    RAISE LOG 'complete_pool_users_charge: Updated % redeemable records and % transaction records for pool %',
        updated_redeemable, updated_transactions, p_pool_id;

    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in complete_pool_users_charge for pool %: %', p_pool_id, SQLERRM;
        RETURN FALSE;
END;
$function$

