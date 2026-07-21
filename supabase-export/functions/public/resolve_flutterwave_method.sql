-- schema:   public
-- function: resolve_flutterwave_method(p_method_checker text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.resolve_flutterwave_method(p_method_checker text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
    RETURN CASE p_method_checker
        WHEN 'PaymentMethod.mobile_money'
            THEN '{"collection_method":"mobilemoney",      "transfer_type":"mobilemoney"}'::JSONB
        WHEN 'PaymentMethod.private_account'
            THEN '{"collection_method":"bank_transfer",    "transfer_type":"account"}'::JSONB
        WHEN 'PaymentMethod.direct_debit'
            THEN '{"collection_method":"debit_ng_account", "transfer_type":"account"}'::JSONB
        WHEN 'PaymentMethod.bank_transfer'
            THEN '{"collection_method":"bank_transfer",    "transfer_type":"account"}'::JSONB
        WHEN 'PaymentMethod.ussd'
            THEN '{"collection_method":"debit_ng_account", "transfer_type":"account"}'::JSONB
        WHEN 'PaymentMethod.e_naira'
            THEN '{"collection_method":"mobilemoney",      "transfer_type":"account"}'::JSONB
        WHEN 'PaymentMethod.opay'
            THEN '{"collection_method":"card",             "transfer_type":"account"}'::JSONB
        WHEN 'PaymentMethod.academix_coin'
            THEN '{"collection_method":null,               "transfer_type":null}'::JSONB
        ELSE NULL
    END;
END;
$function$

