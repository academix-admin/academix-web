-- schema:   public
-- function: validate_quiz_pool_entry(p_user_id uuid, p_topic_id uuid, p_challenge_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.validate_quiz_pool_entry(p_user_id uuid, p_topic_id uuid, p_challenge_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_pool_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result             JSONB := '{"status": null, "error": null}';
    challenge_record   RECORD;
    member_pool        JSONB;
    target_pool        JSONB;
    question_count     INT;
    member_count       INT;
BEGIN
    -- ── Already in a pool? ────────────────────────────────────────────────────
    -- Pure read — no locks, no writes.
    -- Definitive duplicate check is in commit_quiz_pool_entry under FOR UPDATE.
    SELECT jsonb_build_object(
        'pools_details',   row_to_json(pt.*),
        'members_details', row_to_json(pmt.*)
    ) INTO member_pool
    FROM pools_members_table pmt
    LEFT JOIN pools_table pt ON pmt.pools_id = pt.pools_id
    WHERE pmt.users_id = p_user_id
      AND pt.pools_status IN ('Pools.open', 'Pools.sealed', 'Pools.active');

    IF member_pool IS NOT NULL THEN
        IF (member_pool->'pools_details'->>'topics_id')::UUID = p_topic_id THEN
            result := jsonb_set(result, '{status}', '"PoolStatus.this_active"', false);
        ELSE
            result := jsonb_set(result, '{status}', '"PoolStatus.other_active"', false);
        END IF;
        RETURN result;
    END IF;

    -- ── Load challenge config ─────────────────────────────────────────────────
    SELECT
        ct.challenge_question_count,
        ct.challenge_min_participants,
        ct.challenge_max_participants,
        ct.challenge_price,
        gmt.game_mode_checker
    INTO challenge_record
    FROM challenge_table ct
    LEFT JOIN game_mode_table gmt ON gmt.game_mode_id = ct.game_mode_id
    WHERE ct.challenge_id = p_challenge_id;

    IF challenge_record IS NULL THEN
        result := jsonb_set(result, '{status}', '"PoolStatus.unavailable"', false);
        RETURN result;
    END IF;

    -- ── Commit user: verify pool still exists (read-only, no lock) ───────────
    IF p_pool_id IS NOT NULL THEN
        SELECT row_to_json(pt.*) INTO target_pool
        FROM pools_table pt
        WHERE pt.pools_id     = p_pool_id
          AND pt.pools_status IN ('Pools.open', 'Pools.sealed')
          AND pt.pools_locale = p_locale
          AND pt.pools_job    = 'PoolJob.waiting';

        IF target_pool IS NULL THEN
            result := jsonb_set(result, '{status}', '"PoolStatus.pool_no_longer_available"', false);
            result := jsonb_set(result, '{error}',  '"Pool is no longer available."', false);
            RETURN result;
        END IF;

        IF (target_pool->>'topics_id')::UUID != p_topic_id
          OR (target_pool->>'challenge_id')::UUID != p_challenge_id THEN
            result := jsonb_set(result, '{status}', '"PoolStatus.invalid_pool"', false);
            result := jsonb_set(result, '{error}',  '"Pool does not match topic and challenge."', false);
            RETURN result;
        END IF;

        -- Optimistic capacity check — not authoritative, just a fast exit
        SELECT COUNT(*) INTO member_count
        FROM pools_members_table
        WHERE pools_id = p_pool_id;

        IF member_count >= challenge_record.challenge_max_participants THEN
            result := jsonb_set(result, '{status}', '"PoolStatus.pool_full"', false);
            RETURN result;
        END IF;
    END IF;

    -- ── Verify sufficient questions exist — count only, no array load ─────────
    -- Loading the full array here would waste work since commit reloads it.
    -- We only verify the count to fail fast before opening any transaction.
    IF challenge_record.challenge_question_count > 0 THEN
        SELECT COUNT(*) INTO question_count
        FROM (
            SELECT questions_id
            FROM get_accepted_questions(
                p_user_id, p_topic_id, p_locale,
                p_country, p_age, p_gender
            )
            LIMIT challenge_record.challenge_question_count
        ) subquery;

        IF question_count IS NULL OR question_count < challenge_record.challenge_question_count THEN
            result := jsonb_set(result, '{status}', '"PoolStatus.insufficient_questions"', false);
            RETURN result;
        END IF;
    END IF;

    result := jsonb_set(result, '{status}', '"PoolStatus.valid"', false);
    RETURN result;

EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{status}', '"PoolStatus.error"', false);
    result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
    RETURN result;
END;
$function$

