-- schema:   public
-- function: fetch_public_quizzes(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_type text, p_limit_by integer, p_after_quiz_topics jsonb, p_search_key text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_public_quizzes(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_type text, p_limit_by integer, p_after_quiz_topics jsonb, p_search_key text DEFAULT NULL::text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    sortID    TEXT;
    direction TEXT;
BEGIN
    -- Extract cursor fields from the pagination JSONB object
    -- sortID: the last sort_created_id from the previous page (NULL on first page)
    -- direction: 'oldest' = descending order, 'latest' = ascending order
    sortID    := (p_after_quiz_topics->>'sort_id')::TEXT;
    direction := (p_after_quiz_topics->>'direction')::TEXT;

    RETURN QUERY
    WITH
    followed_creators AS (
        SELECT users_creator_id
        FROM users_followers_table
        WHERE users_id = p_user_id
    ),
    personalized_topic_ids AS (
        SELECT topics_id
        FROM personalized_table
        WHERE users_id = p_user_id
    ),

    enriched_pools AS (
        SELECT
            pt.pools_id,
            pt.pools_status,
            pt.pools_locale,
            pt.sort_created_id,
            pt.sort_updated_id,
            pt.pools_duration,
            pt.pools_starting_at,
            pt.pools_job,
            pt.pools_visible,
            pt.pools_auth,
            pt.pools_code,
            pt.challenge_id,
            pt.topics_id,
            pt.pools_job_end_at,
            tt.topics_created_at,
            tt.topics_updated_at,
            tt.sort_created_id      AS topics_sort_created_id,
            tt.sort_updated_id      AS topics_sort_updated_id,
            tt.topics_identity,
            tt.topics_visible       AS topic_visible,
            tt.topics_image,
            ct.challenge_identity,
            ct.challenge_development_charge,
            ct.challenge_price,
            ct.challenge_top_share,
            ct.challenge_mid_share,
            ct.challenge_bot_share,
            ct.challenge_min_participants,
            ct.challenge_max_participants,
            ct.challenge_question_count,
            tr_creator.creator_id,
            tr_identity.translated_identity,
            tr_status.status_translation,
            dc_lang.lang_ok,
            dc_country.country_ok,
            dc_gender.gender_ok,
            dc_age.age_ok,
            member_count.cnt        AS pools_members_count,
            member_count.user_is_member,
            (fc.users_creator_id IS NOT NULL) AS creator_is_followed,
            (pt2.topics_id IS NOT NULL)       AS topic_is_personalised
        FROM pools_table pt
        JOIN topics_table    tt ON tt.topics_id    = pt.topics_id
        JOIN challenge_table ct ON ct.challenge_id = pt.challenge_id

        CROSS JOIN LATERAL (
            SELECT translation::uuid AS creator_id
            FROM translate(tt.topics_created_by, p_locale)
        ) tr_creator
        CROSS JOIN LATERAL (
            SELECT translation AS translated_identity
            FROM translate(tt.topics_identity, p_locale)
        ) tr_identity
        CROSS JOIN LATERAL (
            SELECT translation AS status_translation
            FROM translate(tt.approval_status, p_locale)
        ) tr_status
        CROSS JOIN LATERAL (
            SELECT value AS lang_ok
            FROM decontrol(tt.language_control, p_locale, p_locale)
        ) dc_lang
        CROSS JOIN LATERAL (
            SELECT value AS country_ok
            FROM decontrol(tt.country_control, p_country, p_locale)
        ) dc_country
        CROSS JOIN LATERAL (
            SELECT value AS gender_ok
            FROM decontrol(tt.gender_control, p_gender, p_locale)
        ) dc_gender
        CROSS JOIN LATERAL (
            SELECT value AS age_ok
            FROM decontrol(tt.age_control, p_age, p_locale)
        ) dc_age
        CROSS JOIN LATERAL (
            SELECT
                COUNT(pm.users_id)                                AS cnt,
                COALESCE(BOOL_OR(pm.users_id = p_user_id), false) AS user_is_member
            FROM pools_members_table pm
            WHERE pm.pools_id = pt.pools_id
        ) member_count

        LEFT JOIN followed_creators      fc  ON fc.users_creator_id = tr_creator.creator_id
        LEFT JOIN personalized_topic_ids pt2 ON pt2.topics_id       = tt.topics_id

        WHERE
            pt.pools_status    <> 'Pools.active'
            AND pt.pools_visible = true
            AND pt.pools_locale  = p_locale
            AND pt.pools_starting_at IS NULL
            AND (pt.pools_job IS NULL
                OR (pt.pools_job <> 'PoolJob.cancelled'
                    AND pt.pools_job <> 'PoolJob.pool_ended'))

            -- Cursor pagination:
            -- NULL sortID means first page, no cursor filter needed
            -- 'oldest' (DESC): get rows BEFORE the last seen sort_created_id
            -- 'latest' (ASC) : get rows AFTER  the last seen sort_created_id
            AND (sortID IS NULL OR (
                (direction = 'oldest' AND pt.sort_created_id::TEXT < sortID)
                OR (direction = 'latest' AND pt.sort_created_id::TEXT > sortID)
            ))

            AND NOT member_count.user_is_member
            AND member_count.cnt < ct.challenge_max_participants
            AND (SELECT * FROM get_quiz_content_check(
                tr_creator.creator_id,
                p_user_id,
                tr_identity.translated_identity,
                dc_lang.lang_ok,
                dc_country.country_ok,
                dc_gender.gender_ok,
                dc_age.age_ok,
                tt.topics_visible,
                tr_status.status_translation
            )) = true
            AND (
                SELECT COUNT(*)
                FROM questions_table
                WHERE topics_id         = tt.topics_id
                  AND questions_visible = true
            ) >= ct.challenge_question_count
            AND (
                SELECT COUNT(*)
                FROM get_accepted_questions(
                    p_user_id, tt.topics_id, p_locale, p_country, p_age, p_gender
                )
            ) >= ct.challenge_question_count
            AND (p_type <> 'creator'      OR fc.users_creator_id IS NOT NULL)
            AND (p_type =  'creator'      OR fc.users_creator_id IS NULL)
            AND (p_type <> 'public'       OR pt2.topics_id IS NULL)
            AND (p_type <> 'personalized' OR pt2.topics_id IS NOT NULL)

            -- Search filter: only applied when p_search_key is provided
            -- translated_identity is already resolved via CROSS JOIN LATERAL above
            -- so this is a simple text comparison with no extra function call
            AND (
                p_search_key IS NULL
                OR tr_identity.translated_identity ILIKE '%' || p_search_key || '%'
            )

        -- Explicit branching avoids the dual-CASE NULL sort ambiguity:
        -- 'latest' pages forward in ASC order
        -- 'oldest' / NULL (default) pages forward in DESC order
        ORDER BY
            CASE
                WHEN direction = 'latest' THEN pt.sort_created_id::TEXT
                ELSE NULL
            END ASC NULLS LAST,
            CASE
                WHEN direction = 'oldest' OR direction IS NULL THEN pt.sort_created_id::TEXT
                ELSE NULL
            END DESC NULLS LAST

        LIMIT p_limit_by
    ),

    with_tracker AS (
        SELECT
            ep.*,
            (
                SELECT COUNT(qt.question_tracker_id)
                FROM question_tracker_table qt
                JOIN pools_question_table pq ON pq.pools_question_id = qt.pools_question_id
                WHERE pq.pools_id = ep.pools_id
                  AND qt.users_id = p_user_id
            ) AS question_tracker_count
        FROM enriched_pools ep
    )

    SELECT jsonb_build_object(
        'topics_id',             wt.topics_id,
        'topics_image',          wt.topics_image,
        'topics_created_at',     wt.topics_created_at,
        'topics_updated_at',     wt.topics_updated_at,
        'sort_created_id',       wt.topics_sort_created_id,
        'sort_updated_id',       wt.topics_sort_updated_id,
        'topics_identity',       wt.translated_identity,
        'pools_details', jsonb_build_object(
            'pools_id',          wt.pools_id,
            'pools_locale',      wt.pools_locale,
            'pools_status',      wt.pools_status,
            'sort_created_id',   wt.sort_created_id,
            'sort_updated_id',   wt.sort_updated_id,
            'pools_duration',    wt.pools_duration,
            'pools_starting_at', wt.pools_starting_at,
            'pools_job',         wt.pools_job,
            'pools_visible',     wt.pools_visible,
            'pools_auth',        wt.pools_auth,
            'pools_code',        wt.pools_code,
            'pools_job_end_at',  wt.pools_job_end_at,
            'challenge_details', jsonb_build_object(
                'challenge_id',                 wt.challenge_id,
                'challenge_identity',           (SELECT translation FROM translate(wt.challenge_identity, p_locale)),
                'challenge_development_charge', wt.challenge_development_charge,
                'challenge_price',              wt.challenge_price,
                'challenge_top_share',          wt.challenge_top_share,
                'challenge_mid_share',          wt.challenge_mid_share,
                'challenge_bot_share',          wt.challenge_bot_share,
                'challenge_min_participants',   wt.challenge_min_participants,
                'challenge_max_participants',   wt.challenge_max_participants,
                'challenge_question_count',     wt.challenge_question_count
            ),
            'pools_members_count',    wt.pools_members_count,
            'question_tracker_count', wt.question_tracker_count
        ),
        'creator_details',       get_user_fields(
            wt.creator_id,
            ARRAY['users_id', 'users_names', 'users_username', 'users_image']
        ),
        'creator_is_followed',   wt.creator_is_followed,
        'topic_is_personalised', wt.topic_is_personalised
    )
    FROM with_tracker wt;
END;
$function$

