-- schema:   public
-- function: get_code_data(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_redeem_code text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_code_data(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_redeem_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result      JSONB := '{"status": null, "error": null, "code_data": null, "called": "40"}';
    code_data   JSONB;
    redeemed_id UUID;
BEGIN
    -- ── [1] Fetch code — must belong to this user, be active, not expired ─────
    SELECT
        jsonb_build_object(
            'redeem_code_amount',  rct.redeem_code_amount,
            'redeem_code_id',      rct.redeem_code_id,
            'redeem_code_value',   rct.redeem_code_value,
            'redeem_rule_top',     COALESCE(rcrt.redeem_code_rule_top,   FALSE),
            'redeem_rule_mid',     COALESCE(rcrt.redeem_code_rule_mid,   FALSE),
            'redeem_rule_bot',     COALESCE(rcrt.redeem_code_rule_bot,   FALSE),
            'redeem_rule_rank1',   COALESCE(rcrt.redeem_code_rule_rank1, FALSE),
            'redeem_rule_rank2',   COALESCE(rcrt.redeem_code_rule_rank2, FALSE),
            'redeem_rule_rank3',   COALESCE(rcrt.redeem_code_rule_rank3, FALSE),
            'redeem_code_expires', rct.redeem_code_expires,
            'sort_created_id',     rct.sort_created_id
        )
    INTO code_data
    FROM redeem_code_table rct
    LEFT JOIN redeem_code_rule_table rcrt ON rcrt.redeem_code_rule_id = rct.redeem_code_rule_id
    WHERE rct.redeem_code_value  = p_redeem_code
      AND rct.users_id           = p_user_id       -- strict ownership, no NULL fallback
      AND rct.redeem_code_active = TRUE
      AND (rct.redeem_code_expires IS NULL OR rct.redeem_code_expires > NOW());

    -- ── [2] Validate ──────────────────────────────────────────────────────────
    IF code_data IS NULL THEN
        result := jsonb_set(result, '{status}', '"RedeemCode.not_found"');
        RETURN result;
    END IF;

    -- Single-use check: if a redeemable row already exists this code is spent
    SELECT rt.redeem_code_id
    INTO redeemed_id
    FROM redeemable_table rt
    WHERE rt.redeem_code_id = (code_data->>'redeem_code_id')::UUID
      AND rt.users_id       = p_user_id;

    IF redeemed_id IS NOT NULL THEN
        result := jsonb_set(result, '{status}', '"RedeemCode.not_available"');
        RETURN result;
    END IF;

    -- ── [3] Code is valid and unspent ─────────────────────────────────────────
    result := jsonb_set(result, '{status}',    '"RedeemCode.found"');
    result := jsonb_set(result, '{code_data}', code_data);
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}',  to_jsonb(SQLERRM));
        result := jsonb_set(result, '{status}', '"RedeemCode.failed"');
        RETURN result;
END;
$function$

