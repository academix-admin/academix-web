-- schema:   public
-- function: result_quiz_pool_update(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.result_quiz_pool_update(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_pool_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "pools_quiz": null, "error": null, "called": "500"}'; -- Initialize result JSONB
    pool RECORD;
    pool_status TEXT;  -- Status of the pool
    pool_job TEXT;  -- Job of the pool
    can_submit BOOLEAN;  -- Submision check
BEGIN
    -- Get pool status and job
    SELECT * INTO pool 
    FROM pools_table pt 
    WHERE pt.pools_id = p_pool_id;

    -- Check if pool exists
    IF NOT FOUND THEN
        result := jsonb_set(result, '{status}', '"Pool.not_found"');
        RETURN result;
    END IF;

    result := jsonb_set(result, '{status}', '"Pool.allowed"');
    result := jsonb_set(result, '{pools_quiz}', to_jsonb(pool));

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Handle unexpected errors
        result := jsonb_set(result, '{status}', '"Pool.error"');
        result := jsonb_set(result, '{error}', to_jsonb('Error: ' || SQLERRM));
        RETURN result;
END;
$function$

