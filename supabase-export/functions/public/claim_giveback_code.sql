-- schema:   public
-- function: claim_giveback_code(p_user_id uuid, p_giveback_code text, p_country text, p_locale text, p_gender text, p_age text, p_password text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.claim_giveback_code(p_user_id uuid, p_giveback_code text, p_country text, p_locale text, p_gender text, p_age text, p_password text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result             JSONB := '{"status": null, "error": null, "redeem_code_details": null}';
    v_giveback_id      UUID;
    v_unit_amount      NUMERIC;
    v_total_usage      INT;
    v_stored_password  TEXT;
    v_rule_id          UUID;
    v_age_ctrl         JSONB;
    v_country_ctrl     JSONB;
    v_language_ctrl    JSONB;
    v_gender_ctrl      JSONB;
    v_used_count       INT;
    v_gender_ok        BOOLEAN;
    v_age_ok           BOOLEAN;
    v_country_ok       BOOLEAN;
    v_lang_ok          BOOLEAN;
    v_attempts         INT := 0;
    v_max_attempts     INT := 10;
    v_new_code_id      UUID;
    v_new_code_expires TIMESTAMPTZ;
BEGIN
    -- ── [1] Lock and load the giveback row ────────────────────────────────────
    SELECT
        gt.giveback_id,
        gt.giveback_unit_amount,
        gt.giveback_total_usage,
        gt.giveback_password,
        gt.redeem_code_rule_id,
        gt.age_control,
        gt.country_control,
        gt.language_control,
        gt.gender_control
    INTO
        v_giveback_id,
        v_unit_amount,
        v_total_usage,
        v_stored_password,
        v_rule_id,
        v_age_ctrl,
        v_country_ctrl,
        v_language_ctrl,
        v_gender_ctrl
    FROM giveback_table gt
    WHERE gt.giveback_code = p_giveback_code
    FOR UPDATE;

    IF NOT FOUND THEN
        result := jsonb_set(result, '{status}', '"Giveback.not_found"');
        result := jsonb_set(result, '{error}',  '"Giveback code does not exist"');
        RETURN result;
    END IF;

    -- ── [2] Password check ────────────────────────────────────────────────────
    IF v_stored_password IS NOT NULL THEN
        IF p_password IS NULL OR p_password <> v_stored_password THEN
            result := jsonb_set(result, '{status}', '"Giveback.invalid_password"');
            result := jsonb_set(result, '{error}',  '"Incorrect or missing password"');
            RETURN result;
        END IF;
    END IF;

    -- ── [3] Audience control checks ───────────────────────────────────────────
    --  COALESCE(..., TRUE) — empty control means unrestricted.
    SELECT (SELECT value FROM decontrol(v_gender_ctrl,   p_gender,  p_locale)) INTO v_gender_ok;
    SELECT (SELECT value FROM decontrol(v_age_ctrl,      p_age,     p_locale)) INTO v_age_ok;
    SELECT (SELECT value FROM decontrol(v_country_ctrl,  p_country, p_locale)) INTO v_country_ok;
    SELECT (SELECT value FROM decontrol(v_language_ctrl, p_locale,  p_locale)) INTO v_lang_ok;

    IF NOT COALESCE(v_gender_ok, TRUE) THEN
        result := jsonb_set(result, '{status}', '"Giveback.control_failed"');
        result := jsonb_set(result, '{error}',  '"Gender restriction: you are not eligible for this giveback"');
        RETURN result;
    END IF;

    IF NOT COALESCE(v_age_ok, TRUE) THEN
        result := jsonb_set(result, '{status}', '"Giveback.control_failed"');
        result := jsonb_set(result, '{error}',  '"Age restriction: you are not eligible for this giveback"');
        RETURN result;
    END IF;

    IF NOT COALESCE(v_country_ok, TRUE) THEN
        result := jsonb_set(result, '{status}', '"Giveback.control_failed"');
        result := jsonb_set(result, '{error}',  '"Country restriction: you are not eligible for this giveback"');
        RETURN result;
    END IF;

    IF NOT COALESCE(v_lang_ok, TRUE) THEN
        result := jsonb_set(result, '{status}', '"Giveback.control_failed"');
        result := jsonb_set(result, '{error}',  '"Language restriction: you are not eligible for this giveback"');
        RETURN result;
    END IF;

    -- ── [4] Single-claim-per-user guard ───────────────────────────────────────
    IF EXISTS (
        SELECT 1
        FROM redeem_code_table
        WHERE giveback_id = v_giveback_id
          AND users_id    = p_user_id
    ) THEN
        result := jsonb_set(result, '{status}', '"Giveback.already_claimed"');
        result := jsonb_set(result, '{error}',  '"You have already claimed this giveback"');
        RETURN result;
    END IF;

    -- ── [5] Capacity check ────────────────────────────────────────────────────
    SELECT COUNT(DISTINCT users_id)
    INTO v_used_count
    FROM redeem_code_table
    WHERE giveback_id = v_giveback_id;

    IF v_used_count >= v_total_usage THEN
        result := jsonb_set(result, '{status}', '"Giveback.exhausted"');
        result := jsonb_set(result, '{error}',  '"All claim slots for this giveback have been used"');
        RETURN result;
    END IF;

        IF NOT EXISTS (
            SELECT 1 FROM redeem_code_table WHERE redeem_code_value = p_giveback_code
            AND users_id  = p_user_id
        ) THEN
            INSERT INTO redeem_code_table (
                redeem_code_value,
                redeem_code_amount,
                users_id,
                redeem_code_visible,
                redeem_code_active,
                redeem_code_expires,
                redeem_code_rule_id,
                giveback_id,
                redeem_code_description
            ) VALUES (
                p_giveback_code,
                v_unit_amount,
                p_user_id,
                FALSE,
                TRUE,
                NULL,           -- giveback codes do not expire at claim time
                v_rule_id,
                v_giveback_id,
                p_giveback_code
            )
            RETURNING redeem_code_id, redeem_code_expires
            INTO v_new_code_id, v_new_code_expires;

        END IF;

    IF v_new_code_id IS NULL THEN
        result := jsonb_set(result, '{status}', '"Giveback.code_generation_failed"');
        result := jsonb_set(result, '{error}',  '"Could not generate a unique redeem code after max attempts"');
        RETURN result;
    END IF;

    -- ── [7] Return ────────────────────────────────────────────────────────────
    result := jsonb_set(result, '{status}', '"Giveback.claimed"');
    result := jsonb_set(result, '{redeem_code_details}', jsonb_build_object(
        'redeem_code_id',      v_new_code_id,
        'redeem_code_value',   p_giveback_code,
        'redeem_code_amount',  v_unit_amount,
        'redeem_code_expires', v_new_code_expires
    ));
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{status}', '"Giveback.failed"');
        result := jsonb_set(result, '{error}',  to_jsonb(SQLERRM));
        RETURN result;
END;
$function$

