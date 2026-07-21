-- schema:   public
-- function: grade_pool_quiz(p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.grade_pool_quiz(p_pool_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    pool_data RECORD;
BEGIN

    -- ── [1] Lock pool row and load state ──────────────────────────────────────
    SELECT * INTO pool_data
    FROM pools_table
    WHERE pools_id = p_pool_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- ── [2] Guard: pool must be closed, ended, and not yet graded ─────────────
    IF pool_data.pools_status           <> 'Pools.closed'       OR
       pool_data.pools_allow_submission <> FALSE                 OR
       pool_data.pools_job              <> 'PoolJob.pool_ended'  OR
       pool_data.pools_graded_at        IS NOT NULL
    THEN
        RETURN;
    END IF;

    -- ── [3] Grade all members in one set-based UPDATE ─────────────────────────
    --
    -- FIX: Added pools_id to both SELECT and GROUP BY in the subquery.
    --
    -- Without pools_id in GROUP BY, a user who is a member of multiple pools
    -- would have their tracker rows merged across all pools — producing wrong
    -- counts. More critically, the subquery was only joined back on users_id,
    -- meaning a user's score from a *different* pool could match and overwrite
    -- the target pool's member row.
    --
    -- With pools_id included:
    --   • Aggregation is scoped strictly to this pool's questions.
    --   • The WHERE pmt_inner.pools_id = p_pool_id already filters to the
    --     right members, but GROUP BY pmt_inner.pools_id, pmt_inner.users_id
    --     makes the scope explicit and safe.
    --   • The UPDATE join now matches on BOTH pools_id AND users_id — no
    --     cross-pool bleed is possible.
    --
    -- LEFT JOIN from pools_members_table ensures members who submitted
    -- nothing still get 0/0 rather than being skipped.
    --
    -- COALESCE handles members with no tracker rows (NULL from LEFT JOIN agg).
    UPDATE pools_members_table pmt
    SET
        pools_completed_question_tracker_size = grades.questions_completed,
        pools_completed_question_tracker_time = grades.total_time_taken
    FROM (
        SELECT
            pmt_inner.pools_id,                          -- ← ADDED
            pmt_inner.users_id,
            COALESCE(SUM(
                CASE WHEN qtt.question_tracker_question_status = 'Question.completed'
                     THEN 1 ELSE 0 END
            ), 0) AS questions_completed,
            COALESCE(SUM(qtt.question_tracker_time_taken), 0) AS total_time_taken
        FROM pools_members_table pmt_inner
        LEFT JOIN pools_question_table pqt
            ON pqt.pools_id = pmt_inner.pools_id
        LEFT JOIN question_tracker_table qtt
            ON qtt.pools_question_id = pqt.pools_question_id
           AND qtt.users_id          = pmt_inner.users_id
        WHERE pmt_inner.pools_id = p_pool_id
        GROUP BY pmt_inner.pools_id, pmt_inner.users_id  -- ← ADDED pools_id
    ) grades
    WHERE pmt.pools_id = p_pool_id
      AND pmt.users_id = grades.users_id;

    -- ── [4] Mark pool as graded ───────────────────────────────────────────────
    UPDATE pools_table
    SET pools_graded_at = clock_timestamp()
    WHERE pools_id = p_pool_id;

END;
$function$

