-- schema:   public
-- function: get_public_auth_quiz_pool(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_pool_auth_code text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_public_auth_quiz_pool(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_pool_auth_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    result     JSONB := '{"status": null, "auth": null, "error": null, "quiz_pool": null, "is_member": null, "called": "30"}';
    quiz_pool  JSONB;
    pool_job   TEXT;
    pool_auth  TEXT;
    is_member  BOOLEAN := false;
BEGIN
 
    SELECT
        jsonb_build_object(
            'topics_id',         tt.topics_id,
            'topics_image',      tt.topics_image,
            'topics_created_at', tt.topics_created_at,
            'topics_updated_at', tt.topics_updated_at,
            'sort_created_id',   tt.sort_created_id,
            'sort_updated_id',   tt.sort_updated_id,
            'topics_identity',   tr_identity.translated_identity,
            'pools_details', jsonb_build_object(
                'pools_id',          pt.pools_id,
                'pools_locale',      pt.pools_locale,
                'pools_status',      pt.pools_status,
                'sort_created_id',   pt.sort_created_id,
                'sort_updated_id',   pt.sort_updated_id,
                'pools_duration',    pt.pools_duration,
                'pools_starting_at', pt.pools_starting_at,
                'pools_job',         pt.pools_job,
                'pools_visible',     pt.pools_visible,
                'pools_auth',        pt.pools_auth,
                'pools_code',        pt.pools_code,
                'pools_job_end_at',  pt.pools_job_end_at,
                'challenge_details', jsonb_build_object(
                    'challenge_id',                 ct.challenge_id,
                    'challenge_identity',           (SELECT translation FROM translate(ct.challenge_identity, p_locale)),
                    'challenge_development_charge', ct.challenge_development_charge,
                    'challenge_price',              ct.challenge_price,
                    'challenge_top_share',          ct.challenge_top_share,
                    'challenge_mid_share',          ct.challenge_mid_share,
                    'challenge_bot_share',          ct.challenge_bot_share,
                    'challenge_min_participants',   ct.challenge_min_participants,
                    'challenge_max_participants',   ct.challenge_max_participants,
                    'challenge_question_count',     ct.challenge_question_count,
                    'game_mode_details', jsonb_build_object(
                        'game_mode_id',       gmt.game_mode_id,
                        'game_mode_identity', (SELECT translation FROM translate(gmt.game_mode_identity, p_locale)),
                        'game_mode_checker',  gmt.game_mode_checker
                    )
                ),
                -- Member count and user membership computed in a single scan
                'pools_members_count',    member_agg.cnt,
                'question_tracker_count', tracker_agg.cnt
            ),
            'creator_details', get_user_fields(
                tr_creator.creator_id,
                ARRAY['users_id', 'users_names', 'users_username', 'users_image']
            )
        ),
        -- Capture membership and pool job for use outside the SELECT
        member_agg.user_is_member,
        pt.pools_job,
        pt.pools_auth
    INTO quiz_pool, is_member, pool_job, pool_auth
 
    FROM pools_table pt
    JOIN topics_table   tt  ON tt.topics_id    = pt.topics_id
    JOIN challenge_table ct ON ct.challenge_id = pt.challenge_id
    JOIN game_mode_table gmt ON gmt.game_mode_id = ct.game_mode_id
 
    -- Materialize all translate()/decontrol() calls once per row
    CROSS JOIN LATERAL (
        SELECT translation AS translated_identity
        FROM translate(tt.topics_identity, p_locale)
    ) tr_identity
    CROSS JOIN LATERAL (
        SELECT translation::uuid AS creator_id
        FROM translate(tt.topics_created_by, p_locale)
    ) tr_creator
    CROSS JOIN LATERAL (
        SELECT translation AS status_translation
        FROM translate(tt.approval_status, p_locale)
    ) tr_status
    CROSS JOIN LATERAL (
        SELECT value AS lang_ok    FROM decontrol(tt.language_control, p_locale,  p_locale)
    ) dc_lang
    CROSS JOIN LATERAL (
        SELECT value AS country_ok FROM decontrol(tt.country_control,  p_country, p_locale)
    ) dc_country
    CROSS JOIN LATERAL (
        SELECT value AS gender_ok  FROM decontrol(tt.gender_control,   p_gender,  p_locale)
    ) dc_gender
    CROSS JOIN LATERAL (
        SELECT value AS age_ok     FROM decontrol(tt.age_control,      p_age,     p_locale)
    ) dc_age
 
    -- Member count + user membership in one scan (replaces two separate subqueries)
    CROSS JOIN LATERAL (
        SELECT
            COUNT(pm.users_id)               AS cnt,
            COALESCE(BOOL_OR(pm.users_id = p_user_id), false) AS user_is_member
        FROM pools_members_table pm
        WHERE pm.pools_id = pt.pools_id
    ) member_agg
 
    -- Question tracker count (only fires on result rows, not filter rows)
    CROSS JOIN LATERAL (
        SELECT COUNT(qt.question_tracker_id) AS cnt
        FROM question_tracker_table qt
        JOIN pools_question_table pq ON pq.pools_question_id = qt.pools_question_id
        WHERE pq.pools_id = pt.pools_id
          AND qt.users_id = p_user_id
    ) tracker_agg
 
    WHERE
        -- Cheap index-friendly filters first
        pt.pools_code    = p_pool_auth_code
        AND pt.pools_visible = true
        AND pt.pools_locale = p_locale
        AND pt.pools_status  = 'Pools.open'
        AND (
            pt.pools_job = 'PoolJob.waiting'
            OR pt.pools_job = 'PoolJob.schedule'
            OR (pt.pools_job = 'PoolJob.extended_waiting'
                AND pt.pools_job_end_at::TIMESTAMPTZ > NOW())
        )
        -- Pool not full (uses pre-computed lateral count)
        AND member_agg.cnt < ct.challenge_max_participants
 
        -- Content check (all arguments pre-materialized)
        AND (SELECT * FROM get_quiz_content_check(
            tr_creator.creator_id,
            p_user_id,
            'topic',
            dc_lang.lang_ok,
            dc_country.country_ok,
            dc_gender.gender_ok,
            dc_age.age_ok,
            tt.topics_visible,
            tr_status.status_translation
        )) = true
 
        -- Two-stage question count: raw count first (cheap), per-user second (expensive)
        AND (
            SELECT COUNT(*)
            FROM questions_table
            WHERE topics_id        = tt.topics_id
              AND questions_visible = true
        ) >= ct.challenge_question_count
        AND (
            SELECT COUNT(*)
            FROM get_accepted_questions(
                p_user_id, tt.topics_id, p_locale, p_country, p_age, p_gender
            )
        ) >= ct.challenge_question_count;
 
    -- Build result
    IF quiz_pool IS NOT NULL THEN
 
        IF pool_job = 'PoolJob.schedule' THEN
            result := jsonb_set(result, '{status}', '"PoolCheck.schedule"', false);
        ELSE
            result := jsonb_set(result, '{status}', '"PoolCheck.available"', false);
        END IF;
 
        IF pool_auth = 'PoolAuth.public' THEN
            result := jsonb_set(result, '{auth}', '"AuthCheck.verified"', false);
        ELSE
            result := jsonb_set(result, '{auth}', '"AuthCheck.request"', false);
        END IF;
 
        result := jsonb_set(result, '{quiz_pool}', quiz_pool, false);
 

        result := jsonb_set(result, '{is_member}', to_jsonb(is_member), false);
 
    ELSE
        result := jsonb_set(result, '{auth}',   '"AuthCheck.none"',      false);
        result := jsonb_set(result, '{status}', '"PoolCheck.not_found"', false);
 
        result := jsonb_set(result, '{is_member}', 'false'::jsonb, false);
    END IF;
 
    RETURN result;
 
EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}',  to_jsonb(SQLERRM),       false);
        result := jsonb_set(result, '{status}', '"PoolCheck.failed"',     false);
        RETURN result;
END;
$function$

