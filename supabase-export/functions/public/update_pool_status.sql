-- schema:   public
-- function: update_pool_status(p_pools_id uuid, p_previous_task text, p_public boolean)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.update_pool_status(p_pools_id uuid, p_previous_task text DEFAULT NULL::text, p_public boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    pool_record      JSONB;
    challenge_record JSONB;
    members_count    INT;
    config           JSONB;
    api_url          TEXT;
    bearer_token     TEXT;
    duration         INT := 0;
    difference       INT := 0;
    req_id           TEXT;
    task             TEXT;
    jobEndTime       TIMESTAMP WITH TIME ZONE;
    executionTime    TIMESTAMP WITH TIME ZONE;
    schedule_time    TIMESTAMP WITH TIME ZONE;
BEGIN
    config       := get_platform_config();
    bearer_token := config->>'scheduler_bearer_token';
    api_url      := config->>'scheduler_api_url';

    -- FOR UPDATE on the initial fetch serializes concurrent scheduler firings
    -- for the same pool. Without this, two simultaneous invocations both read
    -- the same pools_job, both pass the guard check below, and both proceed —
    -- causing double transitions (e.g. two start_pools_quiz calls).
    SELECT row_to_json(pt) INTO pool_record
    FROM pools_table pt
    WHERE pt.pools_id = p_pools_id
    FOR UPDATE;

    IF pool_record IS NULL
      OR (
        (pool_record->>'pools_job')::TEXT <> p_previous_task
        AND p_previous_task IS NOT NULL
      )
    THEN
        RETURN;
    END IF;

    SELECT row_to_json(ct) INTO challenge_record
    FROM challenge_table ct
    WHERE ct.challenge_id = (pool_record->>'challenge_id')::UUID;

    IF challenge_record IS NULL THEN
        RETURN;
    END IF;

    SELECT COUNT(pmt.users_id) INTO members_count
    FROM pools_members_table pmt
    WHERE pmt.pools_id = (pool_record->>'pools_id')::UUID;

    -- ── Determine next task ───────────────────────────────────────────────────
    IF p_previous_task IS NULL THEN

        IF p_public = TRUE THEN
            task     := 'PoolJob.waiting';
            duration := (challenge_record->>'challenge_waiting_time')::INT;
        ELSE
            schedule_time := (pool_record->>'pools_starting_at')::TIMESTAMPTZ;
            IF schedule_time IS NOT NULL AND schedule_time > NOW() THEN
                task     := 'PoolJob.schedule';
                duration := EXTRACT(EPOCH FROM (schedule_time - NOW()));
            END IF;
        END IF;

    ELSIF p_previous_task = 'PoolJob.waiting' THEN

        IF (pool_record->>'pools_status')::TEXT = 'Pools.sealed'
          OR members_count >= (challenge_record->>'challenge_min_participants')::INT
        THEN
            PERFORM start_pools_quiz((pool_record->>'pools_id')::UUID);
            task     := 'PoolJob.start_pool';
            duration := (challenge_record->>'challenge_starting_time')::INT;
        ELSE
            PERFORM delete_pool_quiz((pool_record->>'pools_id')::UUID);
            RETURN;
        END IF;

    ELSIF p_previous_task = 'PoolJob.start_pool' THEN

        task       := 'PoolJob.pool_period';
        difference := GREATEST(0, EXTRACT(EPOCH FROM (
            NOW() - (pool_record->>'pools_job_end_at')::TIMESTAMPTZ
        )));

        SELECT pt.pools_duration INTO duration
        FROM pools_table pt
        WHERE pt.pools_id = (pool_record->>'pools_id')::UUID;

        duration := (challenge_record->>'challenge_overhead_time')::INT
                  + duration
                  - difference;

    ELSIF p_previous_task = 'PoolJob.pool_period' THEN

        PERFORM record_pool((pool_record->>'pools_id')::UUID);
        RETURN;

    END IF;

    IF duration IS NULL OR duration <= 0 THEN
        PERFORM delete_pool_quiz((pool_record->>'pools_id')::UUID);
        RETURN;
    END IF;

    jobEndTime    := clock_timestamp() + (duration * INTERVAL '1 second');
    executionTime := jobEndTime;

    UPDATE pools_table
    SET pools_job        = task,
        pools_job_end_at = jobEndTime
    WHERE pools_id = p_pools_id;

    SELECT net.http_post(
        url     := api_url,
        headers := jsonb_build_object(
            'Authorization', bearer_token,
            'Content-Type',  'application/json'
        ),
        body    := jsonb_build_object(
            'record', jsonb_build_object(
                'pools_id',          (pool_record->>'pools_id')::UUID,
                'utc_execution_time', executionTime,
                'task',              task
            )
        )
    ) INTO req_id;

    RAISE NOTICE 'HTTP request sent with req_id: %', req_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'update_pool_status error for pool %: %', p_pools_id, SQLERRM;
END;
$function$

