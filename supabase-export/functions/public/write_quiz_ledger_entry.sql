-- schema:   public
-- function: write_quiz_ledger_entry(p_pools_id uuid, p_amount numeric)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.write_quiz_ledger_entry(p_pools_id uuid, p_amount numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_adc_wallet_id UUID;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'write_quiz_ledger_entry: amount must be > 0';
    END IF;
    IF p_pools_id IS NULL THEN
        RAISE EXCEPTION 'write_quiz_ledger_entry: pools_id is required';
    END IF;
 
    v_adc_wallet_id := public.get_adc_wallet_id();
    IF v_adc_wallet_id IS NULL THEN
        RAISE EXCEPTION 'write_quiz_ledger_entry: ADC wallet not found';
    END IF;
 
    -- Single ADC row — quiz revenue is entirely platform profit, ADC-denominated.
    -- No fiat row because quiz payouts happen inside the ADC system.
    INSERT INTO wallet_ledger_table (
        payment_wallet_id, transaction_id, transaction_type,
        gross_amount, principal_amount, flutterwave_fee_amount, our_profit_amount,
        adc_amount, exchange_rate, currency,
        method_checker, pools_id, redeem_code_id
    ) VALUES (
        v_adc_wallet_id, NULL, 'quiz',
        p_amount, p_amount, 0, p_amount,
        p_amount, 1, 'ADC',
        NULL, p_pools_id, NULL
    );
 
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'write_quiz_ledger_entry error for pool %: %', p_pools_id, SQLERRM;
        RAISE;
END;
$function$

