-- schema:   public
-- function: claim_user_streaks(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.claim_user_streaks(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result                 JSONB := '{"status": null, "daily_streaks_details": null, "error": null, "called": "3118"}';
    streaks_details        JSONB;
    today_date             DATE        := CURRENT_DATE;
    yesterday_date         DATE        := CURRENT_DATE - INTERVAL '1 day';
    last_streak_date       DATE;
    last_streak_count      INT;
    streak_reached         BOOLEAN;
    current_streak_count   INT         := 1;
    existing_today_record  BOOLEAN     := FALSE;
    reward_data            JSONB;
    expire_time            TIMESTAMPTZ;

    -- Role-driven streak config
    v_paid_amount          NUMERIC;
    v_max_duration         INT;
    v_reward_expires_hour  INT;
BEGIN
    -- ── Fetch role-driven streak config for this user ────────────────────────
    SELECT
        rt.roles_streak_amount,
        rt.roles_streak_duration,
        rt.roles_streak_expires
    INTO
        v_paid_amount,
        v_max_duration,
        v_reward_expires_hour
    FROM   public.users_table  ut
    JOIN   public.roles_table  rt ON rt.roles_id = ut.roles_id
    WHERE  ut.users_id = p_user_id;

    -- Fallback if user/role not found
    IF v_max_duration IS NULL THEN
        v_paid_amount         := 0;
        v_max_duration        := 30;
        v_reward_expires_hour := 24;
    END IF;

    -- ── Check if today's record already exists ───────────────────────────────
    SELECT EXISTS(
        SELECT 1 FROM public.daily_streaks_table
        WHERE  users_id    = p_user_id
          AND  streak_date = today_date
    ) INTO existing_today_record;

    -- ── Get most recent streak before today ──────────────────────────────────
    SELECT streak_date, daily_streaks_count
    INTO   last_streak_date, last_streak_count
    FROM   public.daily_streaks_table
    WHERE  users_id    = p_user_id
      AND  streak_date < today_date
      AND  streak_date >= CURRENT_DATE - v_max_duration * INTERVAL '1 day'
    ORDER  BY streak_date DESC
    LIMIT  1;

    IF NOT existing_today_record THEN

        -- ── Calculate streak count ───────────────────────────────────────────
        IF last_streak_date IS NOT NULL THEN
            IF last_streak_date = yesterday_date THEN
                SELECT daily_streaks_reached INTO streak_reached
                FROM   public.daily_streaks_table
                WHERE  users_id    = p_user_id
                  AND  streak_date = yesterday_date;

                -- If yesterday already hit max, reset to 1
                current_streak_count := CASE WHEN streak_reached THEN 1
                                             ELSE last_streak_count + 1 END;
            ELSE
                -- Missed a day — reset
                current_streak_count := 1;
            END IF;
        ELSE
            current_streak_count := 1;
        END IF;

        -- ── Insert today's record ────────────────────────────────────────────
        INSERT INTO public.daily_streaks_table (
            users_id,
            daily_streaks_count,
            daily_streaks_reached,
            streak_date,
            daily_streaks_created_at,
            daily_streaks_awarded
        ) VALUES (
            p_user_id,
            current_streak_count,
            current_streak_count = v_max_duration,
            today_date,
            now()::TEXT,
            CASE WHEN current_streak_count = v_max_duration THEN v_paid_amount ELSE 0.0 END
        )
        RETURNING jsonb_build_object(
            'daily_streaks_count',       current_streak_count,
            'daily_streaks_max',         v_max_duration,
            'daily_streaks_date_number', EXTRACT(DOW FROM CURRENT_TIMESTAMP)::INT + 1,
            'daily_streaks_created_at',  now(),
            'daily_streaks_date',        to_char(today_date, 'YYYY-MM-DD'),
            'daily_streaks_status',      'today',
            'daily_streaks_reached',     current_streak_count = v_max_duration,
            'daily_streaks_awarded',     CASE WHEN current_streak_count = v_max_duration THEN v_paid_amount ELSE 0.0 END,
            'redeem_code_details', jsonb_build_object(
                'redeem_code_id',      NULL,
                'redeem_code_value',   NULL,
                'redeem_code_expires', NULL
            )
        ) INTO streaks_details;

        -- ── Issue redeem code if max streak reached ──────────────────────────
        IF current_streak_count = v_max_duration AND v_paid_amount > 0 THEN
            expire_time := NOW() + v_reward_expires_hour * INTERVAL '1 hour';

            SELECT create_reward_redeem_code(
                p_user_id,
                v_paid_amount,
                'STREAK',
                expire_time,
                'STREAK'
            ) INTO reward_data;

            IF (reward_data->>'redeem_code_id')::UUID IS NOT NULL THEN
                UPDATE public.daily_streaks_table
                SET    daily_streaks_rewarded = TRUE,
                       redeem_code_id         = (reward_data->>'redeem_code_id')::UUID
                WHERE  users_id    = p_user_id
                  AND  streak_date = today_date;

                streaks_details := jsonb_set(streaks_details, '{redeem_code_details}', reward_data::JSONB);
            END IF;
        END IF;

        result := jsonb_set(result, '{daily_streaks_details}', streaks_details, false);
        result := jsonb_set(result, '{status}', '"StreaksReward.success"', false);

    ELSE
        -- ── Return existing today record ─────────────────────────────────────
        SELECT jsonb_build_object(
            'daily_streaks_count',       daily_streaks_count,
            'daily_streaks_max',         v_max_duration,
            'daily_streaks_date_number', EXTRACT(DOW FROM CURRENT_TIMESTAMP)::INT + 1,
            'daily_streaks_created_at',  daily_streaks_created_at,
            'daily_streaks_date',        to_char(today_date, 'YYYY-MM-DD'),
            'daily_streaks_status',      'today',
            'daily_streaks_reached',     daily_streaks_reached,
            'daily_streaks_awarded',     daily_streaks_awarded,
            'redeem_code_details', COALESCE(
                (
                    SELECT jsonb_build_object(
                        'redeem_code_id',      rct.redeem_code_id,
                        'redeem_code_value',   rct.redeem_code_value,
                        'redeem_code_expires', rct.redeem_code_expires
                    )
                    FROM redeem_code_table rct
                    WHERE rct.redeem_code_id = dst.redeem_code_id
                ),
                jsonb_build_object(
                    'redeem_code_id',      NULL,
                    'redeem_code_value',   NULL,
                    'redeem_code_expires', NULL
                )
            )
        ) INTO streaks_details
        FROM public.daily_streaks_table dst
        WHERE users_id    = p_user_id
          AND streak_date = today_date;

        result := jsonb_set(result, '{daily_streaks_details}', streaks_details, false);
        result := jsonb_set(result, '{status}', '"StreaksReward.existing"', false);
    END IF;

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"StreaksReward.error"', false);
        RETURN result;
END;
$function$

