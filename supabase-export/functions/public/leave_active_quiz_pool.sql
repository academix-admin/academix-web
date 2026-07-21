-- schema:   public
-- function: leave_active_quiz_pool(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.leave_active_quiz_pool(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "pools_id": null, "error": null, "called": "118"}'; -- Initialize result JSONB
    active_pool JSONB; -- Stores details of the active quiz pool
    pool_id UUID;      -- ID of the active pool
    r_id UUID;         -- Redeemable ID associated with the user
    t_id UUID;         -- Transaction ID associated with the user
    r_status TEXT;
    t_status TEXT;
    pool_status TEXT;  -- Status of the active pool
    rows_affected INT; -- Number of rows affected by DELETE operations
    question_ids UUID[];
BEGIN
    -- Step 1: Retrieve the active quiz pool for the user
    SELECT * INTO active_pool FROM get_active_quiz(
        p_user_id,
        p_country, -- Country code
        p_locale,  -- Locale (e.g., 'en' for English)
        p_gender,  -- Gender filter
        p_age      -- Age filter
    );

    -- Step 2: Check if an active pool was found
    IF active_pool IS NOT NULL THEN
        -- Extract pool ID and status from the active pool details
        pool_id := (active_pool->'pools_details'->>'pools_id')::UUID;
        pool_status := (active_pool->'pools_details'->>'pools_status')::TEXT;

        -- Step 3: Check if the pool is active
        IF pool_status <> 'Pools.open' THEN
            -- Pool is active; user cannot leave
            result := jsonb_set(result, '{status}', '"PoolActive.blocked"', false);
        ELSE
            -- Step 4: Retrieve redeemable and transaction IDs for the user
            SELECT pt.redeemable_id, rt.redeemable_status, pt.transaction_id, tt.transaction_receiver_status INTO r_id, r_status, t_id, t_status
            FROM pools_members_table pt
            LEFT JOIN redeemable_table rt
            ON rt.redeemable_id = pt.redeemable_id
            LEFT JOIN transaction_table tt
            ON tt.transaction_id = pt.transaction_id
            WHERE pt.pools_id = pool_id AND pt.users_id = p_user_id;

            

            -- Step 5: Update result based on DELETE operation
            IF (r_status = 'RedeemableStatus.pending' AND t_status IS NULL ) OR (r_status is NULL AND t_status = 'TransactionStatus.pending') OR (r_status = 'RedeemableStatus.pending' AND t_status = 'TransactionStatus.pending') THEN

                -- Step 6: Delete the user from the pool member table
                
                -- Clean up related records
                IF r_id IS NOT NULL THEN
                    DELETE FROM redeemable_table WHERE redeemable_id = r_id;
                END IF;
                IF t_id IS NOT NULL THEN
                    DELETE FROM transaction_table WHERE transaction_id = t_id;
                END IF;


                -- Collect question tracker IDs from question_tracker_table
                SELECT COALESCE(array_agg(qqt.question_tracker_id), '{}')
                INTO question_ids
                FROM question_tracker_table qqt
                LEFT JOIN pools_question_table pqt ON qqt.pools_question_id = pqt.pools_question_id
                WHERE pqt.pools_id = pool_id AND qqt.users_id = p_user_id;

                -- Bulk delete from options tracker records
                DELETE FROM option_tracker_table
                WHERE question_tracker_id = ANY(question_ids);    

                -- Bulk delete from question tracker records
                DELETE FROM question_tracker_table
                WHERE question_tracker_id = ANY(question_ids);     

                
                DELETE FROM pools_question_table WHERE pools_id = pool_id AND users_id = p_user_id;

                DELETE FROM pools_members_table pmt
                WHERE  pmt.users_id = p_user_id AND pmt.pools_id = pool_id;

                -- Update result for successful operation
                result := jsonb_set(result, '{status}', '"PoolActive.success"', false);
                result := jsonb_set(result, '{pools_id}', to_jsonb(pool_id), false);
            ELSE
                -- Update result for unsuccessful operation
                result := jsonb_set(result, '{status}', '"PoolActive.unsuccessful"', false);
            END IF;
        END IF;
    ELSE
        -- No active pool found for the user
        result := jsonb_set(result, '{status}', '"PoolActive.no_active"', false);
    END IF;

    -- Step 7: Return the final result
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Catch unexpected errors and update the result
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"PoolActive.error"', false);
        RETURN result;
END;
$function$

