-- schema:   public
-- function: end_pool_quiz(p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.end_pool_quiz(p_pool_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_rows_affected INT;
    v_current_status TEXT;
BEGIN
    -- 1. Validate pool exists and is in an endable state
    SELECT pools_status 
    INTO v_current_status
    FROM pools_table
    WHERE pools_id = p_pool_id;

    IF NOT FOUND THEN
        RAISE WARNING 'end_pool_quiz: Pool % not found.', p_pool_id;
        RETURN FALSE;
    END IF;

    IF v_current_status = 'Pools.closed' THEN
        RAISE WARNING 'end_pool_quiz: Pool % is already closed.', p_pool_id;
        RETURN FALSE;
    END IF;

    -- 2. Perform the update
    UPDATE pools_table
    SET 
        pools_status          = 'Pools.closed',
        pools_job             = 'PoolJob.pool_ended',
        pools_allow_submission = FALSE,
        pools_code            = pools_code || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') -- explicit cast
    WHERE pools_id = p_pool_id;

    -- 3. Confirm update was applied
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected = 0 THEN
        RAISE WARNING 'end_pool_quiz: Update affected 0 rows for pool %.', p_pool_id;
        RETURN FALSE;
    END IF;

    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'end_pool_quiz: Unexpected error for pool %: %', p_pool_id, SQLERRM;
        RETURN FALSE;
END;
$function$

