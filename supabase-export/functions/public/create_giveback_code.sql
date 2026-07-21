-- schema:   public
-- function: create_giveback_code(p_locale text, p_country_control jsonb[], p_language_control jsonb[], p_gender_control jsonb[], p_age_control jsonb[], p_giveback_code text, p_unit numeric, p_usage integer, p_rule_id text, p_password text, p_giveback_identifier text, p_wallet_id uuid, p_amount numeric, p_fee numeric, p_method_checker text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.create_giveback_code(p_locale text, p_country_control jsonb[], p_language_control jsonb[], p_gender_control jsonb[], p_age_control jsonb[], p_giveback_code text, p_unit numeric, p_usage integer, p_rule_id text DEFAULT NULL::text, p_password text DEFAULT NULL::text, p_giveback_identifier text DEFAULT NULL::text, p_wallet_id uuid DEFAULT NULL::uuid, p_amount numeric DEFAULT NULL::numeric, p_fee numeric DEFAULT NULL::numeric, p_method_checker text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result           JSONB := '{"status": null, "error": null, "giveback_details": null}';
    v_giveback_id    UUID;
    v_rule_id        UUID;
    v_age_ctrl       JSONB;
    v_language_ctrl  JSONB;
    v_gender_ctrl    JSONB;
    v_country_ctrl   JSONB;
    v_adc_wallet_id  UUID;
    v_current_profit NUMERIC;
    v_total_adc      NUMERIC;
BEGIN
    -- ── [1] Basic input validation ────────────────────────────────────────────
    IF p_giveback_code IS NULL OR trim(p_giveback_code) = '' THEN
        result := jsonb_set(result, '{status}', '"Giveback.invalid_code"');
        result := jsonb_set(result, '{error}',  '"giveback_code must not be empty"');
        RETURN result;
    END IF;

    IF p_unit IS NULL OR p_unit <= 0 THEN
        result := jsonb_set(result, '{status}', '"Giveback.invalid_unit"');
        result := jsonb_set(result, '{error}',  '"unit must be > 0"');
        RETURN result;
    END IF;

    IF p_usage IS NULL OR p_usage <= 0 THEN
        result := jsonb_set(result, '{status}', '"Giveback.invalid_usage"');
        result := jsonb_set(result, '{error}',  '"usage must be > 0"');
        RETURN result;
    END IF;

    -- External contribution requires fiat params
    IF p_giveback_identifier IS NOT NULL THEN
        IF p_wallet_id IS NULL OR p_amount IS NULL OR p_method_checker IS NULL THEN
            result := jsonb_set(result, '{status}', '"Giveback.missing_contribution_params"');
            result := jsonb_set(result, '{error}',  '"p_wallet_id, p_amount, and p_method_checker are required for external contributions"');
            RETURN result;
        END IF;
        IF p_amount <= 0 THEN
            result := jsonb_set(result, '{status}', '"Giveback.invalid_amount"');
            result := jsonb_set(result, '{error}',  '"p_amount must be > 0"');
            RETURN result;
        END IF;
    END IF;

    -- ── [2] Uniqueness guard ──────────────────────────────────────────────────
    IF EXISTS (SELECT 1 FROM giveback_table WHERE giveback_code = p_giveback_code) THEN
        result := jsonb_set(result, '{status}', '"Giveback.duplicate_code"');
        result := jsonb_set(result, '{error}',  '"A giveback with this code already exists"');
        RETURN result;
    END IF;

    -- ── [3] our_profit pre-check (platform-funded path only) ─────────────────
    --
    --  For external contributions we skip this check because the contribution
    --  rows land in the ledger FIRST (inside write_giveback_ledger_entry),
    --  raising our_profit before the giveback rows deduct from it. The balance
    --  is always covered by construction in that path.
    --
    --  For platform-funded givebacks there is no incoming cash, so we must
    --  confirm the ADC wallet already holds enough profit to cover the full
    --  reservation before we commit anything.
    --
    --  FOR UPDATE on wallet_balance_table prevents two concurrent
    --  create_giveback_code calls from both reading the same balance, both
    --  passing the check, and together over-committing the profit.
    IF p_giveback_identifier IS NULL THEN

        v_total_adc := p_unit * p_usage;

        v_adc_wallet_id := public.get_adc_wallet_id();
        IF v_adc_wallet_id IS NULL THEN
            result := jsonb_set(result, '{status}', '"Giveback.adc_wallet_not_found"');
            result := jsonb_set(result, '{error}',  '"ADC wallet could not be resolved"');
            RETURN result;
        END IF;

        SELECT our_profit
        INTO v_current_profit
        FROM wallet_balance_table
        WHERE payment_wallet_id = v_adc_wallet_id
        FOR UPDATE;

        -- Treat a missing balance row as zero (wallet exists but has never been touched)
        v_current_profit := COALESCE(v_current_profit, 0);

        IF v_current_profit < v_total_adc THEN
            result := jsonb_set(result, '{status}', '"Giveback.insufficient_profit"');
            result := jsonb_set(result, '{error}',  to_jsonb(
                format('ADC wallet our_profit is %s but giveback requires %s',
                       v_current_profit, v_total_adc)
            ));
            RETURN result;
        END IF;

    END IF;

    -- ── [4] Build audience controls ───────────────────────────────────────────
    v_age_ctrl      := save_control_details('Control.age',      p_age_control,      p_locale);
    v_language_ctrl := save_control_details('Control.language', p_language_control, p_locale);
    v_gender_ctrl   := save_control_details('Control.gender',   p_gender_control,   p_locale);
    v_country_ctrl  := save_control_details('Control.country',  p_country_control,  p_locale);

    -- ── [5] Cast rule_id ──────────────────────────────────────────────────────
    BEGIN
        v_rule_id := p_rule_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_rule_id := NULL;
    END;

    -- ── [6] Insert giveback record ────────────────────────────────────────────
    INSERT INTO giveback_table (
        giveback_code,
        giveback_unit_amount,
        giveback_total_usage,
        giveback_password,
        redeem_code_rule_id,
        giveback_identifier,
        age_control,
        country_control,
        language_control,
        gender_control
    ) VALUES (
        p_giveback_code,
        p_unit,
        p_usage,
        p_password,
        v_rule_id,
        p_giveback_identifier,
        COALESCE(v_age_ctrl,      '{}'),
        COALESCE(v_country_ctrl,  '{}'),
        COALESCE(v_language_ctrl, '{}'),
        COALESCE(v_gender_ctrl,   '{}')
    )
    RETURNING giveback_id INTO v_giveback_id;

    -- ── [7] Write ledger rows ─────────────────────────────────────────────────
    --  write_giveback_ledger_entry is a dumb writer — it does not re-check the
    --  balance. All business logic lives here in create_giveback_code.
    PERFORM public.write_giveback_ledger_entry(
        p_giveback_id         := v_giveback_id,
        p_unit_amount         := p_unit,
        p_total_usage         := p_usage,
        p_giveback_identifier := p_giveback_identifier,
        p_wallet_id           := p_wallet_id,
        p_fiat_amount         := p_amount,
        p_fee                 := p_fee,
        p_method_checker      := p_method_checker
    );

    -- ── [8] Return result ─────────────────────────────────────────────────────
    result := jsonb_set(result, '{status}', '"Giveback.created"');
    result := jsonb_set(result, '{giveback_details}', jsonb_build_object(
        'giveback_id',           v_giveback_id,
        'giveback_code',         p_giveback_code,
        'giveback_unit_amount',  p_unit,
        'giveback_total_usage',  p_usage,
        'giveback_total_amount', p_unit * p_usage,
        'giveback_identifier',   p_giveback_identifier,
        'has_password',          (p_password IS NOT NULL)
    ));
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{status}', '"Giveback.failed"');
        result := jsonb_set(result, '{error}',  to_jsonb(SQLERRM));
        RETURN result;
END;
$function$

