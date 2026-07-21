-- schema:   public
-- function: write_giveback_ledger_entry(p_giveback_id uuid, p_unit_amount numeric, p_total_usage integer, p_giveback_identifier text, p_wallet_id uuid, p_fiat_amount numeric, p_fee numeric, p_method_checker text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.write_giveback_ledger_entry(p_giveback_id uuid, p_unit_amount numeric, p_total_usage integer, p_giveback_identifier text, p_wallet_id uuid DEFAULT NULL::uuid, p_fiat_amount numeric DEFAULT NULL::numeric, p_fee numeric DEFAULT NULL::numeric, p_method_checker text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_adc_wallet_id UUID;
    v_currency      TEXT;
    v_rate          NUMERIC;
    v_net           NUMERIC;
    v_total_adc     NUMERIC;        -- unit_amount * total_usage (ADC)
    v_total_fiat    NUMERIC;        -- total_adc * rate (fiat equivalent of reservation)
BEGIN
    v_adc_wallet_id := public.get_adc_wallet_id();
    IF v_adc_wallet_id IS NULL THEN
        RAISE EXCEPTION 'write_giveback_ledger_entry: ADC wallet not found';
    END IF;
 
    v_total_adc := p_unit_amount * p_total_usage;
 
    -- ── PLATFORM-FUNDED ───────────────────────────────────────────────────────
    IF p_giveback_identifier IS NULL THEN
        -- Single row: platform deducts the reserved ADC from its own profit.
        INSERT INTO wallet_ledger_table (
            payment_wallet_id, transaction_id, transaction_type,
            gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
            adc_amount, exchange_rate, currency,
            method_checker, pools_id
        ) VALUES (
            v_adc_wallet_id, NULL, 'giveback',
            -v_total_adc, 0, 0, -v_total_adc,
            -v_total_adc, 1, 'ADC',
            NULL, NULL
        );
        RETURN;
    END IF;
 
    -- ── EXTERNAL CONTRIBUTION ─────────────────────────────────────────────────
    -- All fiat params are required when an identifier is provided.
    IF p_wallet_id IS NULL OR p_fiat_amount IS NULL THEN
        RAISE EXCEPTION 'write_giveback_ledger_entry: p_wallet_id and p_fiat_amount are required for external contributions';
    END IF;
 
    SELECT payment_wallet_currency, payment_wallet_buy_rate
    INTO v_currency, v_rate
    FROM payment_wallet_table
    WHERE payment_wallet_id = p_wallet_id;
 
    IF NOT FOUND THEN
        RAISE EXCEPTION 'write_giveback_ledger_entry: fiat wallet % not found', p_wallet_id;
    END IF;
 
    v_net        := p_fiat_amount - COALESCE(p_fee, 0);
    v_total_fiat := v_total_adc / NULLIF(v_rate, 0);   -- ADC amount expressed in fiat
 
    -- ROW 1: fiat contribution inflow → platform profit on fiat wallet
    INSERT INTO wallet_ledger_table (
        payment_wallet_id, transaction_id, transaction_type,
        gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
        adc_amount, exchange_rate, currency,
        method_checker, pools_id
    ) VALUES (
        p_wallet_id, NULL, 'contribution',
        p_fiat_amount, p_fiat_amount, COALESCE(p_fee, 0), v_net,
        0, v_rate, v_currency,
        p_method_checker, NULL
    );
 
    -- ROW 2: ADC mirror of fiat contribution → platform profit on ADC wallet
    INSERT INTO wallet_ledger_table (
        payment_wallet_id, transaction_id, transaction_type,
        gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
        adc_amount, exchange_rate, currency,
        method_checker, pools_id
    ) VALUES (
        v_adc_wallet_id, NULL, 'contribution',
        p_fiat_amount * v_rate,
        p_fiat_amount * v_rate,
        COALESCE(p_fee, 0) * v_rate,
        v_net * v_rate,
        p_fiat_amount * v_rate,
        v_rate, 'ADC',
        p_method_checker, NULL
    );
 
    -- ROW 3: fiat giveback reservation — deducts reserved amount from fiat profit
    --   gross is negative fiat equivalent of the ADC reservation.
    INSERT INTO wallet_ledger_table (
        payment_wallet_id, transaction_id, transaction_type,
        gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
        adc_amount, exchange_rate, currency,
        method_checker, pools_id
    ) VALUES (
        p_wallet_id, NULL, 'giveback',
        -v_total_fiat, 0, 0, -v_total_fiat,
        0, v_rate, v_currency,
        p_method_checker, NULL
    );
 
    -- ROW 4: ADC giveback reservation — deducts reserved ADC from platform profit
    INSERT INTO wallet_ledger_table (
        payment_wallet_id, transaction_id, transaction_type,
        gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
        adc_amount, exchange_rate, currency,
        method_checker, pools_id
    ) VALUES (
        v_adc_wallet_id, NULL, 'giveback',
        -v_total_adc, 0, 0, -v_total_adc,
        -v_total_adc, 1, 'ADC',
        p_method_checker, NULL
    );
 
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'write_giveback_ledger_entry error for giveback %: %', p_giveback_id, SQLERRM;
        RAISE;
END;
$function$

