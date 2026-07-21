-- schema:   public
-- function: fetch_user_quiz_history(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_after_histories jsonb, p_search_key text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_user_quiz_history(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_after_histories jsonb, p_search_key text DEFAULT NULL::text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sortID    TEXT;
    direction TEXT;
BEGIN
    -- Extract cursor fields from the pagination JSONB object
    -- sortID: the last sort_created_id from the previous page (NULL on first page)
    -- direction: 'oldest' = descending order, 'latest' = ascending order
    sortID    := (p_after_histories->>'sort_id')::TEXT;
    direction := (p_after_histories->>'direction')::TEXT;

    RETURN QUERY
    SELECT jsonb_build_object(
        'topics_identity',                          (SELECT translation FROM translate(tt.topics_identity, p_locale)),
        'topics_image',                             tt.topics_image,
        'pools_duration',                           pt.pools_duration,
        'pools_id',                                 pt.pools_id,
        'challenge_question_count',                 COALESCE(ct.challenge_question_count, ct.challenge_question_count),
        'pools_members_rank',                       pmt.pools_members_rank,
        'pools_members_points',                     pmt.pools_members_points,
        'pools_completed_question_tracker_time',    pmt.pools_completed_question_tracker_time,
        'pools_completed_question_tracker_size',    pmt.pools_completed_question_tracker_size,
        'pools_members_paid_amount',                pmt.pools_members_paid_amount,
        'pools_members_created_at',                 pmt.pools_members_created_at,
        -- Client uses this as the next cursor value
        'sort_created_id',                          pmt.sort_created_id
    )
    FROM pools_members_table pmt
    LEFT JOIN pools_table     pt ON pt.pools_id     = pmt.pools_id
    LEFT JOIN topics_table    tt ON tt.topics_id    = pt.topics_id
    LEFT JOIN challenge_table ct ON ct.challenge_id = pt.challenge_id
    WHERE
        -- Only return history for this user
        pmt.users_id = p_user_id

        -- Only return completed pools
        AND pt.pools_completed_at IS NOT NULL

        -- Cursor pagination:
        -- NULL sortID means first page, no cursor filter needed
        -- 'oldest' (DESC): get rows BEFORE the last seen sort_created_id
        -- 'latest' (ASC) : get rows AFTER  the last seen sort_created_id
        AND (
            sortID IS NULL
            OR (direction = 'oldest' AND pmt.sort_created_id::TEXT < sortID)
            OR (direction = 'latest' AND pmt.sort_created_id::TEXT > sortID)
        )

        -- Search filter: only applied when p_search_key is provided
        -- Calls translate() inline — O(1) lookup so no CTE needed
        AND (
            p_search_key IS NULL
            OR (SELECT translation FROM translate(tt.topics_identity, p_locale)) ILIKE '%' || p_search_key || '%'
        )

    -- Explicit branching avoids the dual-CASE NULL sort ambiguity:
    -- 'latest' pages forward in ASC order
    -- 'oldest' / NULL (default) pages forward in DESC order
    ORDER BY
        CASE
            WHEN direction = 'latest' THEN pmt.sort_created_id
            ELSE NULL
        END ASC NULLS LAST,
        CASE
            WHEN direction = 'oldest' OR direction IS NULL THEN pmt.sort_created_id
            ELSE NULL
        END DESC NULLS LAST

    LIMIT p_limit_by;
END;
$function$

