-- schema:   public
-- function: get_give_back_code(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_after_giveback jsonb)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_give_back_code(p_user_id uuid DEFAULT NULL::uuid, p_country text DEFAULT NULL::text, p_locale text DEFAULT 'en'::text, p_gender text DEFAULT NULL::text, p_age text DEFAULT NULL::text, p_limit_by integer DEFAULT 20, p_after_giveback jsonb DEFAULT '{}'::jsonb)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_sort_id   TEXT;
    v_direction TEXT;
BEGIN
    v_sort_id   := (p_after_giveback->>'sort_id')::TEXT;
    v_direction := (p_after_giveback->>'direction')::TEXT;
 
    RETURN QUERY
    WITH
 
    claimed_counts AS (
        SELECT
            rct.giveback_id,
            COUNT(DISTINCT rct.users_id) AS claimed
        FROM redeem_code_table rct
        WHERE rct.giveback_id IS NOT NULL
        GROUP BY rct.giveback_id
    ),
 
    user_claims AS (
        SELECT
            rct.giveback_id,
            rct.redeem_code_id,
            rct.redeem_code_value,
            EXISTS (
                SELECT 1 FROM redeemable_table rt
                WHERE rt.redeem_code_id = rct.redeem_code_id
                  AND rt.users_id       = p_user_id
            ) AS is_spent
        FROM redeem_code_table rct
        WHERE p_user_id IS NOT NULL
          AND rct.users_id    = p_user_id
          AND rct.giveback_id IS NOT NULL
    ),
 
    filtered_givebacks AS (
        SELECT
            gt.giveback_id,
            gt.giveback_code,
            gt.giveback_password,
            gt.giveback_unit_amount,
            gt.giveback_total_usage,
            gt.giveback_total_amount,
            gt.giveback_identifier,
            gt.giveback_created_at,
            gt.sort_created_id,
            -- rule fields (NULL when no rule is attached)
            rcrt.redeem_code_rule_top,
            rcrt.redeem_code_rule_mid,
            rcrt.redeem_code_rule_bot,
            rcrt.redeem_code_rule_rank1,
            rcrt.redeem_code_rule_rank2,
            rcrt.redeem_code_rule_rank3,
            COALESCE(cc.claimed, 0)                            AS claimed_count,
            gt.giveback_total_usage - COALESCE(cc.claimed, 0) AS remaining_slots,
            uc.redeem_code_id    AS user_code_id,
            uc.redeem_code_value AS user_code_value,
            uc.is_spent          AS user_code_spent
        FROM giveback_table gt
        LEFT JOIN redeem_code_rule_table rcrt ON rcrt.redeem_code_rule_id = gt.redeem_code_rule_id
        LEFT JOIN claimed_counts         cc   ON cc.giveback_id           = gt.giveback_id
        LEFT JOIN user_claims            uc   ON uc.giveback_id           = gt.giveback_id
 
        WHERE
            COALESCE(cc.claimed, 0) < gt.giveback_total_usage
 
            AND COALESCE(
                (SELECT value FROM decontrol(gt.language_control, p_locale, p_locale)),
                TRUE
            )
 
            AND (
                p_user_id IS NULL
                OR (
                    COALESCE(
                        (SELECT value FROM decontrol(gt.country_control, p_country, p_locale)),
                        TRUE
                    )
                    AND COALESCE(
                        (SELECT value FROM decontrol(gt.age_control, p_age, p_locale)),
                        TRUE
                    )
                    AND COALESCE(
                        (SELECT value FROM decontrol(gt.gender_control, p_gender, p_locale)),
                        TRUE
                    )
                )
            )
 
            AND (
                v_sort_id IS NULL
                OR (v_direction = 'oldest' AND gt.sort_created_id < v_sort_id)
                OR (v_direction = 'latest' AND gt.sort_created_id > v_sort_id)
            )
    )
 
    SELECT
        jsonb_build_object(
 
            'giveback_detail', jsonb_build_object(
                'giveback_id',           fg.giveback_id,
                'giveback_code',         fg.giveback_code,
                'giveback_unit_amount',  fg.giveback_unit_amount,
                'giveback_total_usage',  fg.giveback_total_usage,
                'giveback_total_amount', fg.giveback_total_amount,
                'giveback_identifier',   fg.giveback_identifier,
                'remaining_slots',       fg.remaining_slots,
                'claimed_count',         fg.claimed_count,
                'sort_created_id',       fg.sort_created_id,
                'redeem_rule_top',       COALESCE(fg.redeem_code_rule_top,   FALSE),
                'redeem_rule_mid',       COALESCE(fg.redeem_code_rule_mid,   FALSE),
                'redeem_rule_bot',       COALESCE(fg.redeem_code_rule_bot,   FALSE),
                'redeem_rule_rank1',     COALESCE(fg.redeem_code_rule_rank1, FALSE),
                'redeem_rule_rank2',     COALESCE(fg.redeem_code_rule_rank2, FALSE),
                'redeem_rule_rank3',     COALESCE(fg.redeem_code_rule_rank3, FALSE)
            ),
 
            'giveback_collection_details', CASE
                WHEN p_user_id IS NULL THEN NULL
                ELSE jsonb_build_object(
                    'has_claimed',       fg.user_code_id IS NOT NULL,
                    'redeem_code_value', fg.user_code_value,
                    'is_spent',          COALESCE(fg.user_code_spent, FALSE),
                    'remaining_slots',   fg.remaining_slots,
                    'can_claim',         fg.user_code_id IS NULL,
                    'has_password',      fg.giveback_password IS NOT NULL
                )
            END
 
        )
    FROM filtered_givebacks fg
    ORDER BY
        CASE WHEN v_direction = 'latest'
             THEN fg.sort_created_id END ASC,
        CASE WHEN v_direction = 'oldest' OR v_direction IS NULL
             THEN fg.sort_created_id END DESC
    LIMIT p_limit_by;
 
END;
$function$

