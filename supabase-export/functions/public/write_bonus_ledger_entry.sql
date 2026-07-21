-- schema:   public
-- function: write_bonus_ledger_entry(p_redeem_code_id uuid, p_amount numeric)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.write_bonus_ledger_entry(p_redeem_code_id uuid, p_amount numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_adc_wallet_id UUID;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'write_bonus_ledger_entry: amount must be > 0';
    END IF;
    IF p_redeem_code_id IS NULL THEN
        RAISE EXCEPTION 'write_bonus_ledger_entry: redeem_code_id is required';
    END IF;
 
    v_adc_wallet_id := public.get_adc_wallet_id();
    IF v_adc_wallet_id IS NULL THEN
        RAISE EXCEPTION 'write_bonus_ledger_entry: ADC wallet not found';
    END IF;
 
    -- Single ADC row — bonus is paid entirely from ADC platform profit.
    -- No fiat row because bonuses are ADC-denominated.
    INSERT INTO wallet_ledger_table (
        payment_wallet_id, transaction_id, transaction_type,
        gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
        adc_amount, exchange_rate, currency,
        method_checker, pools_id, redeem_code_id
    ) VALUES (
        v_adc_wallet_id, NULL, 'bonus',
        -p_amount, -p_amount, 0, -p_amount,
        -p_amount, 1, 'ADC',
        NULL, NULL, p_redeem_code_id
    );
 
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'write_bonus_ledger_entry error for redeem_code %: %', p_redeem_code_id, SQLERRM;
        RAISE;
END;
$function$

