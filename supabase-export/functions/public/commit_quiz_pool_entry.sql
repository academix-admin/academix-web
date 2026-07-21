-- schema:   public
-- function: commit_quiz_pool_entry(p_user_id uuid, p_topic_id uuid, p_challenge_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_pool_id uuid, p_redeem_code text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.commit_quiz_pool_entry(p_user_id uuid, p_topic_id uuid, p_challenge_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_pool_id uuid DEFAULT NULL::uuid, p_redeem_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result               JSONB := '{"status": null, "pools_id": null, "transaction_id": null, "redeemable_id": null, "error": null, "called": "116"}';
    payment_data         JSONB;
    join_pool            JSONB;
    open_pool            JSONB;
    member_pool          JSONB;
    u_pools_id           UUID;
    max_participants     INT;
    question_count       INT;
    current_member_count INT;
    new_member_count     INT;
    found_duplicate      INT;
    topic_questions_id   UUID[];
    is_commit_user       BOOLEAN := (p_pool_id IS NOT NULL);
BEGIN

    -- ── Already in a pool? ────────────────────────────────────────────────────
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
        result := jsonb_set(result, '{pools_id}',
            to_jsonb((member_pool->'pools_details'->>'pools_id')::TEXT), false);
        result := jsonb_set(result, '{transaction_id}',
            to_jsonb((member_pool->'members_details'->>'transaction_id')::TEXT), false);
        RETURN result;
    END IF;

    -- ── Load challenge config ─────────────────────────────────────────────────
    SELECT
        ct.challenge_max_participants,
        ct.challenge_question_count
    INTO
        max_participants,
        question_count
    FROM challenge_table ct
    WHERE ct.challenge_id = p_challenge_id;

    -- ── Load questions for this user ──────────────────────────────────────────
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

    -- ── Payment ───────────────────────────────────────────────────────────────
    SELECT * INTO payment_data
    FROM charge_user_quiz_pool(
        p_user_id, p_challenge_id, p_locale,
        p_country, p_gender, p_age, p_redeem_code
    );
    
    -- 🔧 FIX 2: Guard payment_data itself
    IF payment_data IS NULL THEN
        result := jsonb_set(result, '{status}', '"PoolStatus.error"', false);
        result := jsonb_set(result, '{error}', '"Payment function returned NULL"', false);
        RETURN result;
    END IF;

    -- 🔧 FIX 1: Guard all jsonb_set with NULL checks
    IF payment_data->>'status' IS NOT NULL THEN
        result := jsonb_set(result, '{status}', to_jsonb(payment_data->>'status'), false);
    END IF;
    
    -- Only check for successful payment
    IF NOT (
        (payment_data->>'status')::TEXT = 'Payment.success'
        AND (
            (payment_data->'transaction_details'->>'transaction_id')::UUID IS NOT NULL
            OR (payment_data->>'redeemable_id')::UUID IS NOT NULL
        )
    ) THEN
        IF payment_data->>'error' IS NOT NULL THEN
            result := jsonb_set(result, '{error}', to_jsonb(payment_data->>'error'), false);
        END IF;
        IF payment_data->>'called' IS NOT NULL THEN
            result := jsonb_set(result, '{called}', to_jsonb(payment_data->'called'), false);
        END IF;
        RETURN result;
    END IF;

    -- ── Find or create pool ───────────────────────────────────────────────────
    IF is_commit_user THEN
        SELECT row_to_json(pt.*) INTO join_pool
        FROM pools_table pt
        WHERE pt.pools_id     = p_pool_id
          AND pt.pools_status IN ('Pools.open', 'Pools.sealed')
          AND pt.pools_job    = 'PoolJob.waiting'
        FOR UPDATE;

        IF join_pool IS NULL THEN
            IF (payment_data->'transaction_details'->>'transaction_id')::UUID IS NOT NULL THEN
                DELETE FROM transaction_table
                WHERE transaction_id =
                    (payment_data->'transaction_details'->>'transaction_id')::UUID;
            END IF;
            IF (payment_data->>'redeemable_id')::UUID IS NOT NULL THEN
                DELETE FROM redeemable_table
                WHERE redeemable_id = (payment_data->>'redeemable_id')::UUID;
            END IF;
            result := jsonb_set(result, '{status}', '"PoolStatus.pool_no_longer_available"', false);
            result := jsonb_set(result, '{error}',
                '"Pool was removed before you could join. Please start a new search."', false);
            RETURN result;
        END IF;

        u_pools_id := (join_pool->>'pools_id')::UUID;

    ELSE
        BEGIN
            INSERT INTO pools_table (topics_id, challenge_id, pools_locale)
            VALUES (p_topic_id, p_challenge_id, p_locale)
            RETURNING pools_id INTO u_pools_id;

        EXCEPTION WHEN unique_violation THEN
            SELECT pools_id INTO u_pools_id
            FROM pools_table
            WHERE topics_id    = p_topic_id
              AND challenge_id = p_challenge_id
              AND pools_locale = p_locale
              AND pools_status IN ('Pools.open', 'Pools.sealed')
            FOR UPDATE;

            IF u_pools_id IS NULL THEN
                IF (payment_data->'transaction_details'->>'transaction_id')::UUID IS NOT NULL THEN
                    DELETE FROM transaction_table
                    WHERE transaction_id =
                        (payment_data->'transaction_details'->>'transaction_id')::UUID;
                END IF;
                IF (payment_data->>'redeemable_id')::UUID IS NOT NULL THEN
                    DELETE FROM redeemable_table
                    WHERE redeemable_id = (payment_data->>'redeemable_id')::UUID;
                END IF;
                result := jsonb_set(result, '{status}', '"PoolStatus.pool_no_longer_available"', false);
                result := jsonb_set(result, '{error}', '"Pool just closed — please retry."', false);
                RETURN result;
            END IF;
        END;
    END IF;

    -- ── Definitive insert under row lock ──────────────────────────────────────
    PERFORM 1 FROM pools_table
    WHERE pools_id = u_pools_id
    FOR UPDATE;

    SELECT COUNT(*) INTO current_member_count
    FROM pools_members_table
    WHERE pools_id = u_pools_id;

    IF current_member_count >= max_participants THEN
        IF (payment_data->'transaction_details'->>'transaction_id')::UUID IS NOT NULL THEN
            DELETE FROM transaction_table
            WHERE transaction_id =
                (payment_data->'transaction_details'->>'transaction_id')::UUID;
        END IF;
        IF (payment_data->>'redeemable_id')::UUID IS NOT NULL THEN
            DELETE FROM redeemable_table
            WHERE redeemable_id = (payment_data->>'redeemable_id')::UUID;
        END IF;
        result := jsonb_set(result, '{status}', '"PoolStatus.pool_full"', false);
        result := jsonb_set(result, '{error}',
            to_jsonb(format('Pool has reached maximum capacity of %s participants',
                max_participants)), false);
        RETURN result;
    END IF;

    -- Link transaction to pool
    IF (payment_data->'transaction_details'->>'transaction_id')::UUID IS NOT NULL THEN
        UPDATE transaction_table
        SET pools_id = u_pools_id
        WHERE transaction_id =
            (payment_data->'transaction_details'->>'transaction_id')::UUID;
    END IF;

    -- Link redeem code to pool
    IF (payment_data->>'redeem_code_id')::UUID IS NOT NULL THEN
        UPDATE redeem_code_table
        SET pools_id = u_pools_id
        WHERE redeem_code_id = (payment_data->>'redeem_code_id')::UUID;
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

    IF found_duplicate = 0 THEN
        IF (payment_data->'transaction_details'->>'transaction_id')::UUID IS NOT NULL THEN
            DELETE FROM transaction_table
            WHERE transaction_id =
                (payment_data->'transaction_details'->>'transaction_id')::UUID;
        END IF;
        IF (payment_data->>'redeemable_id')::UUID IS NOT NULL THEN
            DELETE FROM redeemable_table
            WHERE redeemable_id = (payment_data->>'redeemable_id')::UUID;
        END IF;
        result := jsonb_set(result, '{status}', '"PoolStatus.duplicate"', false);
        RETURN result;
    END IF;

    -- ── Per-user question insert ───────────────────────────────────────────────
    INSERT INTO pools_question_table (pools_id, questions_id, users_id)
    SELECT u_pools_id, unnest(topic_questions_id), p_user_id;

    -- Recount and seal if full
    SELECT COUNT(*) INTO new_member_count
    FROM pools_members_table
    WHERE pools_id = u_pools_id;

    IF new_member_count >= max_participants THEN
        UPDATE pools_table
        SET pools_status = 'Pools.sealed'
        WHERE pools_id     = u_pools_id
          AND pools_status = 'Pools.open';
    END IF;

    -- ── Build response with NULL guards ───────────────────────────────────────
    result := jsonb_set(result, '{status}', '"PoolStatus.engaged"', false);
    result := jsonb_set(result, '{pools_id}', to_jsonb(u_pools_id::TEXT), false);
    
    IF payment_data->'transaction_details'->>'transaction_id' IS NOT NULL THEN
        result := jsonb_set(result, '{transaction_id}',
            to_jsonb(payment_data->'transaction_details'->>'transaction_id'), false);
    END IF;
    
    IF payment_data->>'redeemable_id' IS NOT NULL THEN
        result := jsonb_set(result, '{redeemable_id}',
            to_jsonb(payment_data->>'redeemable_id'), false);
    END IF;

    RAISE LOG 'COMMITERROR: %', result;
    
    -- 🔧 FIX 3: Defensive fallback
    IF result IS NULL THEN
        result := jsonb_build_object(
            'status', 'PoolStatus.error',
            'error', 'Result became NULL during processing'
        );
    END IF;
    
    RETURN result;

EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{status}', '"PoolStatus.error"', false);
    result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
    
    -- 🔧 Ensure result isn't NULL even in exception
    IF result IS NULL THEN
        result := jsonb_build_object(
            'status', 'PoolStatus.error',
            'error', SQLERRM
        );
    END IF;
    
    RETURN result;
END;
$function$

