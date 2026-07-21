-- schema:   public
-- function: write_deposit_ledger_entry(p_wallet_id uuid, p_amount numeric, p_fee numeric, p_method_checker text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.write_deposit_ledger_entry(p_wallet_id uuid, p_amount numeric, p_fee numeric, p_method_checker text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_currency      TEXT;
    v_rate          NUMERIC;
    v_adc_wallet_id UUID;
    v_net           NUMERIC;    -- p_amount - fee, used for profit attribution
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'write_deposit_ledger_entry: amount must be > 0';
    END IF;
 
    -- Resolve currency and current buy rate from the fiat wallet.
    SELECT payment_wallet_currency, payment_wallet_buy_rate
    INTO v_currency, v_rate
    FROM payment_wallet_table
    WHERE payment_wallet_id = p_wallet_id;
 
    IF NOT FOUND THEN
        RAISE EXCEPTION 'write_deposit_ledger_entry: wallet % not found', p_wallet_id;
    END IF;
 
    v_adc_wallet_id := public.get_adc_wallet_id();
    IF v_adc_wallet_id IS NULL THEN
        RAISE EXCEPTION 'write_deposit_ledger_entry: ADC wallet not found';
    END IF;
 
    v_net := p_amount - COALESCE(p_fee, 0);
 
    -- ROW 1: fiat deposit — all goes to platform profit (no user liability on deposits)
    INSERT INTO wallet_ledger_table (
        payment_wallet_id, transaction_id, transaction_type,
        gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
        adc_amount, exchange_rate, currency,
        method_checker, pools_id, redeem_code_id
    ) VALUES (
        p_wallet_id, NULL, 'deposit',
        p_amount, p_amount, COALESCE(p_fee, 0), v_net,
        0, v_rate, v_currency,
        p_method_checker, NULL, NULL
    );
 
    -- ROW 2: ADC mirror of fiat deposit — keeps ADC wallet our_profit in sync.
    --   gross = fiat_amount * rate (ADC equivalent of cash received).
    --   adc_amount = same value (the ADC wallet tracks its own units).
    INSERT INTO wallet_ledger_table (
        payment_wallet_id, transaction_id, transaction_type,
        gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
        adc_amount, exchange_rate, currency,
        method_checker, pools_id, redeem_code_id
    ) VALUES (
        v_adc_wallet_id, NULL, 'deposit',
        p_amount * v_rate,
        p_amount * v_rate,
        COALESCE(p_fee, 0) * v_rate,
        v_net * v_rate,
        p_amount * v_rate,
        v_rate, 'ADC',
        p_method_checker, NULL, NULL
    );
 
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'write_deposit_ledger_entry error for wallet %: %', p_wallet_id, SQLERRM;
        RAISE;
END;
$function$

