-- schema:   public
-- function: create_or_join_public_quiz_pool(p_user_id uuid, p_topic_id uuid, p_challenge_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_pool_id uuid, p_redeem_code text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.create_or_join_public_quiz_pool(p_user_id uuid, p_topic_id uuid, p_challenge_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_pool_id uuid DEFAULT NULL::uuid, p_redeem_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result               JSONB := '{"status": null, "quiz_pool": null, "transaction_details": null, "error": null, "called": "116"}';
    pool_end_at          TIMESTAMP WITH TIME ZONE;
    pool_job             TEXT;
    question_count       INT;
    min_participants     INT;
    max_participants     INT;
    current_member_count INT;
    topic_questions_id   UUID[];
    member_pool          JSONB;
    payment_data         JSONB;
    u_pools_id           UUID;
    u_topics_id          UUID;
    u_pools_job          TEXT;
    u_pools_visible      BOOLEAN;
    join_pool            JSONB;
    open_pool            JSONB;
    transaction_details  JSONB;
    active_pool          JSONB;
    found_duplicate      INT;
    game_checker         TEXT;
    check_out            BOOLEAN := TRUE;
    advisory_lock_key    BIGINT;
    new_member_count     INT;
    is_commit_user       BOOLEAN;
BEGIN

    -- =========================================================================
    -- COMMIT USER PATH (p_pool_id IS NOT NULL)
    -- Only commit users (those given a specific pool_id to join) enter here.
    -- They must NEVER create a new pool under any circumstance.
    -- Advisory lock scoped to the specific pool_id only.
    -- Strict early exit if pool is gone — deleted pools return an error.
    -- =========================================================================
    IF p_pool_id IS NOT NULL THEN

        is_commit_user := TRUE;

        advisory_lock_key := ('x' || substring(
            md5(p_pool_id::text) from 1 for 15
        ))::bit(60)::bigint;
        PERFORM pg_advisory_xact_lock(advisory_lock_key);

        -- Check if already in a pool.
        -- Includes sealed so users in a just-sealed pool are correctly detected.
        SELECT jsonb_build_object(
            'pools_details',   row_to_json(pt.*),
            'members_details', row_to_json(pmt.*)
        ) INTO member_pool
        FROM pools_members_table pmt
        LEFT JOIN pools_table pt ON pmt.pools_id = pt.pools_id
        WHERE pmt.users_id = p_user_id
          AND pt.pools_status IN ('Pools.open', 'Pools.sealed', 'Pools.active')
        FOR UPDATE OF pmt;

        IF member_pool IS NULL THEN

            -- Fetch the exact target pool under lock.
            -- Commit users can join open OR sealed pools (sealed = full but
            -- waiting for update_pool_status to transition it to active).
            -- If this returns NULL the pool was deleted by update_pool_status
            -- (insufficient members) or never existed — hard stop either way.
            SELECT
                row_to_json(pt.*),
                pt.pools_job,
                pt.pools_job_end_at
            INTO
                join_pool,
                pool_job,
                pool_end_at
            FROM pools_table pt
            WHERE pt.pools_id     = p_pool_id
              AND pt.pools_status IN ('Pools.open', 'Pools.sealed')
              AND pt.pools_locale = p_locale
              AND pt.pools_job    = 'PoolJob.waiting'
            FOR UPDATE;

            -- Pool not found — it was either deleted by update_pool_status
            -- (failed to meet min participants) or was never valid.
            -- Commit users must NEVER fall through to create a new pool.
            -- Return a clear error so the client can re-engage fresh.
            IF join_pool IS NULL THEN
                result := jsonb_set(result, '{status}', '"PoolStatus.pool_no_longer_available"', false);
                result := jsonb_set(result, '{error}', '"Pool has been removed or is no longer accepting members. Please start a new search."', false);
                RETURN result;
            END IF;

            -- Topic + challenge must match the pool the commit user was given
            IF (join_pool->>'topics_id')::UUID != p_topic_id
              OR (join_pool->>'challenge_id')::UUID != p_challenge_id THEN
                result := jsonb_set(result, '{status}', '"PoolStatus.invalid_pool"', false);
                result := jsonb_set(result, '{error}', '"Pool does not match topic and challenge"', false);
                RETURN result;
            END IF;

            -- Load challenge config
            SELECT
                ct.challenge_question_count,
                ct.challenge_min_participants,
                ct.challenge_max_participants,
                gmt.game_mode_checker
            INTO
                question_count,
                min_participants,
                max_participants,
                game_checker
            FROM challenge_table ct
            LEFT JOIN game_mode_table gmt ON gmt.game_mode_id = ct.game_mode_id
            WHERE ct.challenge_id = p_challenge_id;

            -- Optimistic capacity check — definitive check happens later under
            -- pool-level FOR UPDATE when inserting the member row
            SELECT COUNT(*) INTO current_member_count
            FROM pools_members_table
            WHERE pools_id = p_pool_id;

            IF current_member_count >= max_participants THEN
                result := jsonb_set(result, '{status}', '"PoolStatus.pool_full"', false);
                result := jsonb_set(result, '{error}',
                    to_jsonb(format('Pool has reached maximum capacity of %s participants', max_participants)),
                    false);
                RETURN result;
            END IF;

        END IF; -- member_pool IS NULL (commit path)

    -- =========================================================================
    -- ENGAGE USER PATH (p_pool_id IS NULL)
    -- Only engage users enter here. They find an existing open pool or create
    -- one. They are the ONLY ones permitted to create a new pool.
    -- No advisory lock — concurrent INSERTs are safe via the unique partial
    -- index on (topics_id, challenge_id, pools_locale) WHERE status='Pools.open'.
    -- Sealed pools are NOT covered by the unique index so a new open pool
    -- can be created immediately after sealing without any wait.
    -- =========================================================================
    ELSE

        is_commit_user := FALSE;

        -- Check if already in a pool.
        -- Includes sealed so users in a just-sealed pool are correctly detected.
        SELECT jsonb_build_object(
            'pools_details',   row_to_json(pt.*),
            'members_details', row_to_json(pmt.*)
        ) INTO member_pool
        FROM pools_members_table pmt
        LEFT JOIN pools_table pt ON pmt.pools_id = pt.pools_id
        WHERE pmt.users_id = p_user_id
          AND pt.pools_status IN ('Pools.open', 'Pools.sealed', 'Pools.active')
        FOR UPDATE OF pmt;

        IF member_pool IS NOT NULL THEN
            IF (member_pool->'pools_details'->>'topics_id')::UUID = p_topic_id THEN
                result := jsonb_set(result, '{status}', '"PoolStatus.this_active"', false);
            ELSE
                result := jsonb_set(result, '{status}', '"PoolStatus.other_active"', false);
            END IF;
        END IF;

    END IF; -- p_pool_id IS NOT NULL

    -- =========================================================================
    -- SHARED PATH — runs for both engage and commit users not already in a pool
    -- =========================================================================
    IF member_pool IS NULL THEN

        -- Load challenge config (skipped for commit users who loaded it above)
        IF question_count IS NULL THEN
            SELECT
                ct.challenge_question_count,
                ct.challenge_min_participants,
                ct.challenge_max_participants,
                gmt.game_mode_checker
            INTO
                question_count,
                min_participants,
                max_participants,
                game_checker
            FROM challenge_table ct
            LEFT JOIN game_mode_table gmt ON gmt.game_mode_id = ct.game_mode_id
            WHERE ct.challenge_id = p_challenge_id;
        END IF;

        -- Load questions
        IF question_count > 0 THEN
            SELECT ARRAY_AGG(questions_id) INTO topic_questions_id
            FROM (
                SELECT questions_id
                FROM get_accepted_questions(
                    p_user_id, p_topic_id, p_locale,
                    p_country, p_age, p_gender
                )
                LIMIT question_count::INT
            ) subquery;
        END IF;

        IF topic_questions_id IS NULL THEN
            result := jsonb_set(result, '{status}', '"PoolStatus.unavailable"', false);
            RETURN result;
        END IF;

        IF array_length(topic_questions_id, 1) <> question_count::INT THEN
            result := jsonb_set(result, '{status}', '"PoolStatus.insufficient_questions"', false);
            RETURN result;
        END IF;

        -- Process payment
        SELECT * INTO payment_data
        FROM charge_user_quiz_pool(
            p_user_id, p_challenge_id, p_locale,
            p_country, p_gender, p_age, p_redeem_code
        );

        -- Payment failed
        IF NOT (
            (payment_data->>'status')::TEXT = 'Payment.success'
            AND (
                (payment_data->'transaction_details'->>'transaction_id')::UUID IS NOT NULL
                OR (payment_data->>'redeemable_id')::UUID IS NOT NULL
            )
        ) THEN
            result := jsonb_set(result, '{status}', to_jsonb((payment_data->>'status')), false);
            IF (payment_data->>'error')::TEXT IS NOT NULL THEN
                result := jsonb_set(result, '{error}', to_jsonb((payment_data->>'error')), false);
            END IF;
            IF (payment_data->>'called')::TEXT IS NOT NULL THEN
                result := jsonb_set(result, '{called}', to_jsonb((payment_data->'called')), false);
            END IF;
            RETURN result;
        END IF;

        -- ── Engage user: find or create pool ─────────────────────────────────
        -- ONLY engage users (is_commit_user = FALSE) are allowed to create pools.
        -- Commit users skip this entire block — their join_pool was already
        -- validated above and will be used directly when setting u_pools_id.
        IF NOT is_commit_user THEN

            BEGIN
                -- Attempt to INSERT a new open pool.
                -- Unique partial index covers only status='Pools.open' so:
                --   - If no open pool exists → INSERT succeeds → this user
                --     owns the new pool
                --   - If an open pool exists → unique_violation → fall into
                --     EXCEPTION block to join the existing pool
                --   - If only a sealed pool exists → INSERT succeeds because
                --     sealed is NOT covered by the unique index → new open
                --     pool created immediately, no wait
                INSERT INTO pools_table (topics_id, challenge_id, pools_locale)
                VALUES (p_topic_id, p_challenge_id, p_locale)
                RETURNING row_to_json(pools_table.*) INTO open_pool;

                check_out := FALSE;
                result := jsonb_set(result, '{status}', '"PoolStatus.engaged"', false);

            EXCEPTION WHEN unique_violation THEN

                -- An open pool exists — fetch it under FOR UPDATE.
                -- Include sealed in case it transitioned between our INSERT
                -- attempt and this read — we still want to join it if there
                -- is room, and the definitive capacity check below handles
                -- the full case correctly.
                SELECT row_to_json(p.*) INTO open_pool
                FROM pools_table p
                WHERE p.topics_id    = p_topic_id
                  AND p.challenge_id = p_challenge_id
                  AND p.pools_locale = p_locale
                  AND p.pools_status IN ('Pools.open', 'Pools.sealed')
                FOR UPDATE;

                -- Pool disappeared between INSERT conflict and this SELECT.
                -- Sealed → deleted by update_pool_status, or race with another
                -- transaction. Refund and tell client to retry — next call
                -- will INSERT a fresh pool successfully.
                IF open_pool IS NULL THEN
                    result := jsonb_set(result, '{status}', '"PoolStatus.pool_no_longer_available"', false);
                    result := jsonb_set(result, '{error}', '"Pool just closed — please retry"', false);
                    IF (payment_data->'transaction_details'->>'transaction_id')::UUID IS NOT NULL THEN
                        DELETE FROM transaction_table
                        WHERE transaction_id = (payment_data->'transaction_details'->>'transaction_id')::UUID;
                    END IF;
                    IF (payment_data->>'redeemable_id')::UUID IS NOT NULL THEN
                        DELETE FROM redeemable_table
                        WHERE redeemable_id = (payment_data->>'redeemable_id')::UUID;
                    END IF;
                    RETURN result;
                END IF;

                result := jsonb_set(result, '{status}', '"PoolStatus.engaged"', false);

            END; -- BEGIN...EXCEPTION block

        ELSE

            -- ── Commit user post-payment pool re-validation ───────────────────
            -- Payment succeeded but we must re-confirm the pool still exists
            -- under lock before proceeding. update_pool_status may have deleted
            -- the pool (insufficient members) in the window between the
            -- top-of-function validation and payment completion.
            --
            -- FIX: Use p_pool_id (the original parameter) not join_pool->>'pools_id'.
            -- join_pool may be NULL here if member_pool was non-NULL earlier and
            -- the top block was skipped — reading join_pool->>'pools_id' when
            -- join_pool is NULL produces NULL, the WHERE matches nothing, and
            -- join_pool stays NULL, causing a false pool_no_longer_available
            -- error and refund for a pool that still exists.
            -- p_pool_id is always the correct authoritative value in this path.
            SELECT row_to_json(pt.*) INTO join_pool
            FROM pools_table pt
            WHERE pt.pools_id     = p_pool_id
              AND pt.pools_status IN ('Pools.open', 'Pools.sealed')
              AND pt.pools_job    = 'PoolJob.waiting'
            FOR UPDATE;

            -- Pool was deleted by update_pool_status between our initial check
            -- and now — refund and return a clear error.
            -- Commit users must NEVER fall through to pool creation.
            IF join_pool IS NULL THEN
                result := jsonb_set(result, '{status}', '"PoolStatus.pool_no_longer_available"', false);
                result := jsonb_set(result, '{error}', '"Pool was removed before you could join. Please start a new search."', false);
                IF (payment_data->'transaction_details'->>'transaction_id')::UUID IS NOT NULL THEN
                    DELETE FROM transaction_table
                    WHERE transaction_id = (payment_data->'transaction_details'->>'transaction_id')::UUID;
                END IF;
                IF (payment_data->>'redeemable_id')::UUID IS NOT NULL THEN
                    DELETE FROM redeemable_table
                    WHERE redeemable_id = (payment_data->>'redeemable_id')::UUID;
                END IF;
                RETURN result;
            END IF;

            result := jsonb_set(result, '{status}', '"PoolStatus.engaged"', false);

        END IF; -- NOT is_commit_user

        -- Set u_pools_id from whichever pool source applied
        IF join_pool IS NOT NULL THEN
            u_pools_id      := (join_pool->>'pools_id')::UUID;
            u_topics_id     := (join_pool->>'topics_id')::UUID;
            u_pools_job     := (join_pool->>'pools_job')::TEXT;
            u_pools_visible := (join_pool->>'pools_visible')::BOOLEAN;
        ELSIF open_pool IS NOT NULL THEN
            u_pools_id      := (open_pool->>'pools_id')::UUID;
            u_topics_id     := (open_pool->>'topics_id')::UUID;
            u_pools_job     := (open_pool->>'pools_job')::TEXT;
            u_pools_visible := (open_pool->>'pools_visible')::BOOLEAN;
        END IF;

    END IF; -- member_pool IS NULL

    -- =========================================================================
    -- INSERT USER INTO POOL
    -- Definitive capacity check under pool-level FOR UPDATE lock.
    -- This is the single authoritative gate — all earlier checks are
    -- optimistic fast-exits. Only this one guarantees correctness.
    --
    -- KEY MECHANIC — pool sealing:
    -- After a successful member insert, we recount members. If the new
    -- count equals max_participants, we seal the pool atomically by setting
    -- pools_status = 'Pools.sealed'. This lifts the unique partial index
    -- constraint (which only covers pools_status = 'Pools.open'), allowing
    -- the very next engage user to INSERT a brand new open pool immediately
    -- without waiting for update_pool_status to run.
    -- =========================================================================
    IF u_pools_id IS NOT NULL AND u_topics_id = p_topic_id AND payment_data IS NOT NULL THEN

        -- Acquire pool-level row lock — serializes all concurrent joiners
        -- for this specific pool at this point
        PERFORM 1 FROM pools_table
        WHERE pools_id = u_pools_id
        FOR UPDATE;

        -- Definitive member count under lock — this is authoritative
        SELECT COUNT(*) INTO current_member_count
        FROM pools_members_table
        WHERE pools_id = u_pools_id;

        -- Pool is full — refund and exit.
        IF current_member_count >= max_participants THEN
            result := jsonb_set(result, '{status}', '"PoolStatus.pool_full"', false);
            result := jsonb_set(result, '{error}',
                to_jsonb(format('Pool has reached maximum capacity of %s participants', max_participants)),
                false);
            IF (payment_data->'transaction_details'->>'transaction_id')::UUID IS NOT NULL THEN
                DELETE FROM transaction_table
                WHERE transaction_id = (payment_data->'transaction_details'->>'transaction_id')::UUID;
            END IF;
            IF (payment_data->>'redeemable_id')::UUID IS NOT NULL THEN
                DELETE FROM redeemable_table
                WHERE redeemable_id = (payment_data->>'redeemable_id')::UUID;
            END IF;
            RETURN result;
        END IF;

        -- Link redeem code to pool
        IF (payment_data->>'redeem_code_id')::UUID IS NOT NULL THEN
            UPDATE redeem_code_table
            SET pools_id = u_pools_id
            WHERE redeem_code_id = (payment_data->>'redeem_code_id')::UUID;
        END IF;

        -- Link transaction to pool
        IF (payment_data->'transaction_details'->>'transaction_id')::UUID IS NOT NULL THEN
            UPDATE transaction_table
            SET pools_id = u_pools_id
            WHERE transaction_id = (payment_data->'transaction_details'->>'transaction_id')::UUID;
        END IF;

        -- Insert member
        INSERT INTO pools_members_table (pools_id, users_id, transaction_id, redeemable_id)
        VALUES (
            u_pools_id,
            p_user_id,
            (payment_data->'transaction_details'->>'transaction_id')::UUID,
            (payment_data->>'redeemable_id')::UUID
        )
        ON CONFLICT (pools_id, users_id) DO NOTHING;

        GET DIAGNOSTICS found_duplicate = ROW_COUNT;

        -- Duplicate insert — user was already in this pool
        IF found_duplicate = 0 THEN
            IF (payment_data->'transaction_details'->>'transaction_id')::UUID IS NOT NULL THEN
                DELETE FROM transaction_table
                WHERE transaction_id = (payment_data->'transaction_details'->>'transaction_id')::UUID;
            END IF;
            IF (payment_data->>'redeemable_id')::UUID IS NOT NULL THEN
                DELETE FROM redeemable_table
                WHERE redeemable_id = (payment_data->>'redeemable_id')::UUID;
            END IF;
            result := jsonb_set(result, '{status}', '"PoolStatus.duplicate"', false);
            RETURN result;
        END IF;

        -- Recount after successful insert — this is the authoritative count
        SELECT COUNT(*) INTO new_member_count
        FROM pools_members_table
        WHERE pools_id = u_pools_id;

        -- ── Pool sealing ──────────────────────────────────────────────────────
        -- Seal atomically the moment max is reached. The guard
        -- AND pools_status = 'Pools.open' prevents double-sealing.
        -- Once sealed, the unique partial index no longer applies and the
        -- next engage user's INSERT creates a fresh open pool immediately.
        IF new_member_count >= max_participants THEN
            UPDATE pools_table
            SET pools_status = 'Pools.sealed'
            WHERE pools_id      = u_pools_id
              AND pools_status  = 'Pools.open';
        END IF;

        -- Bulk insert questions for this user
        INSERT INTO pools_question_table (pools_id, questions_id, users_id)
        SELECT u_pools_id, unnest(topic_questions_id), p_user_id;

    END IF;

    -- =========================================================================
    -- FETCH ACTIVE POOL AND TRANSACTION FOR RESPONSE
    -- =========================================================================
    IF member_pool IS NOT NULL
      OR (u_pools_id IS NOT NULL AND u_topics_id IS NOT NULL AND payment_data IS NOT NULL)
    THEN

        SELECT * INTO active_pool
        FROM get_active_quiz(p_user_id, p_country, p_locale, p_gender, p_age);

        IF active_pool IS NOT NULL THEN
            result := jsonb_set(result, '{quiz_pool}', active_pool, false);
        END IF;

        IF (member_pool->'members_details'->>'transaction_id')::UUID IS NOT NULL
          OR (payment_data->'transaction_details'->>'transaction_id')::UUID IS NOT NULL
        THEN
            SELECT * INTO transaction_details
            FROM fetch_user_transaction_by_id(
                p_user_id, p_country, p_locale, p_gender, p_age,
                COALESCE(
                    (member_pool->'members_details'->>'transaction_id')::UUID,
                    (payment_data->'transaction_details'->>'transaction_id')::UUID
                )::UUID
            );

            IF transaction_details IS NOT NULL THEN
                result := jsonb_set(result, '{transaction_details}', transaction_details, false);
            END IF;
        END IF;

    END IF;

    RETURN result;

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$function$

