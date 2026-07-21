-- schema:   public
-- function: rank_pool_quiz(p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.rank_pool_quiz(p_pool_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    pool_data RECORD;
BEGIN

    -- ── [1] Lock pool row and load state ──────────────────────────────────────
    -- FOR UPDATE ensures only one caller ranks this pool at a time.
    -- The second caller will wait here, then re-evaluate the guard below
    -- after the first caller commits.
    SELECT * INTO pool_data
    FROM pools_table
    WHERE pools_id = p_pool_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- ── [2] Guard: must be graded and not yet ranked ──────────────────────────
    IF pool_data.pools_graded_at IS NULL OR pool_data.pools_ranked_at IS NOT NULL THEN
        RETURN;
    END IF;

    -- ── [3] Assign ranks in a single set-based UPDATE ─────────────────────────
    -- ROW_NUMBER() produces a gapless 1-based rank matching the sort criteria.
    -- No array allocation, no per-row loop — scales to any pool size.
    UPDATE pools_members_table pmt
    SET pools_members_rank = ranking.rank
    FROM (
        SELECT
            users_id,
            ROW_NUMBER() OVER (
                ORDER BY
                    pools_completed_question_tracker_size DESC,
                    pools_completed_question_tracker_time ASC,
                    sort_created_id                       ASC
            ) AS rank
        FROM pools_members_table
        WHERE pools_id = p_pool_id
    ) ranking
    WHERE pmt.pools_id  = p_pool_id
      AND pmt.users_id  = ranking.users_id;

    -- ── [4] Mark pool as ranked ───────────────────────────────────────────────
    -- clock_timestamp() used instead of now() so the timestamp reflects
    -- actual wall time of completion, not transaction start time.
    UPDATE pools_table
    SET pools_ranked_at = clock_timestamp()
    WHERE pools_id = p_pool_id;

END;
$function$

