-- schema:   public
-- function: write_cashout_ledger_entry(p_wallet_id uuid, p_amount numeric, p_fee numeric, p_rate numeric, p_method_checker text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.write_cashout_ledger_entry(p_wallet_id uuid, p_amount numeric, p_fee numeric, p_rate numeric, p_method_checker text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_currency      TEXT;
    v_adc_wallet_id UUID;
    v_gross_fiat    NUMERIC;    -- total fiat leaving (amount + fee)
    v_gross_adc     NUMERIC;    -- ADC equivalent of v_gross_fiat
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'write_cashout_ledger_entry: amount must be > 0';
    END IF;
    IF p_rate IS NULL OR p_rate <= 0 THEN
        RAISE EXCEPTION 'write_cashout_ledger_entry: rate must be > 0';
    END IF;
 
    SELECT payment_wallet_currency
    INTO v_currency
    FROM payment_wallet_table
    WHERE payment_wallet_id = p_wallet_id;
 
    IF NOT FOUND THEN
        RAISE EXCEPTION 'write_cashout_ledger_entry: wallet % not found', p_wallet_id;
    END IF;
 
    v_adc_wallet_id := public.get_adc_wallet_id();
    IF v_adc_wallet_id IS NULL THEN
        RAISE EXCEPTION 'write_cashout_ledger_entry: ADC wallet not found';
    END IF;
 
    v_gross_fiat := p_amount + COALESCE(p_fee, 0);
    v_gross_adc  := v_gross_fiat * p_rate;
 
    -- ROW 1: fiat outflow — reduces platform profit on fiat wallet
    --   our_profit_amount = -gross_fiat so the trigger subtracts the full amount from our_profit.
    INSERT INTO wallet_ledger_table (
        payment_wallet_id, transaction_id, transaction_type,
        gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
        adc_amount, exchange_rate, currency,
        method_checker, pools_id, redeem_code_id
    ) VALUES (
        p_wallet_id, NULL, 'cashout',
        -v_gross_fiat, -v_gross_fiat, -COALESCE(p_fee, 0), -v_gross_fiat,
        -v_gross_adc, p_rate, v_currency,
        p_method_checker, NULL, NULL
    );
 
    -- ROW 2: ADC equivalent outflow — reduces platform profit on ADC wallet.
    --   Mirrors ROW 1 in ADC units so both wallets stay balanced.
    INSERT INTO wallet_ledger_table (
        payment_wallet_id, transaction_id, transaction_type,
        gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
        adc_amount, exchange_rate, currency,
        method_checker, pools_id, redeem_code_id
    ) VALUES (
        v_adc_wallet_id, NULL, 'cashout',
        -v_gross_adc, -v_gross_adc, 0, -v_gross_adc,
        -v_gross_adc, p_rate, 'ADC',
        p_method_checker, NULL, NULL
    );
 
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'write_cashout_ledger_entry error for wallet %: %', p_wallet_id, SQLERRM;
        RAISE;
END;
$function$

