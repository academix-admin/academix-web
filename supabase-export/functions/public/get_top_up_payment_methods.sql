-- schema:   public
-- function: get_top_up_payment_methods(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_wallet_it uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_top_up_payment_methods(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_wallet_it uuid)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sql_query text;
BEGIN
    -- Construct the dynamic SQL query
    sql_query := format($$
        SELECT
            jsonb_build_object(
                'payment_method_id', pmt.payment_method_id,
                'payment_method_checker', pmt.payment_method_checker,
                'payment_wallet_id', pmt.payment_wallet_id,
                'sort_created_id', pmt.sort_created_id,
                'payment_method_identity', pmt.payment_method_identity,
                'method_requirements',mrt.*,
                'translated', jsonb_build_object(
                    'translation_default_locale', ptrt.translation_default_locale,
                    'translation', ptrt.%I
                ),
                'country_details',jsonb_build_object(
                    'country_identity',ct.country_identity,
                    'country_three_iso_code',ct.country_three_iso_code,
                    'country_phone_digit',ct.country_phone_digit,
                    'country_two_iso_code',ct.country_two_iso_code,
                    'country_phone_code',ct.country_phone_code,
                    'translated', jsonb_build_object(
                        'translation_default_locale', ctrt.translation_default_locale,
                        'translation', ctrt.%I
                    )
                )
            )
        FROM payment_method_table pmt
        LEFT JOIN payment_wallet_table pwt ON pwt.payment_wallet_id = pmt.payment_wallet_id
        LEFT JOIN country_table ct ON ct.country_id = pwt.country_id
        LEFT JOIN translation_table ctrt ON ctrt.translation_id = ct.translation_id
        LEFT JOIN method_requirement_table mrt ON mrt.method_requirement_id = pmt.method_requirement_id
        LEFT JOIN translation_table ptrt ON ptrt.translation_id = pmt.translation_id
        LEFT JOIN age_control_table acct ON pmt.age_control_id = acct.age_control_id
        WHERE 
            pmt.payment_wallet_id = %L
            AND pmt.payment_method_buy_active = TRUE
            AND acct.%I = TRUE
            AND pmt.method_requirement_id IS NOT NULL
            AND pwt.country_id IS NOT NULL
        GROUP BY
            pmt.payment_method_id, 
            pmt.payment_method_checker, 
            pmt.payment_wallet_id, 
            pmt.sort_created_id,
            pmt.payment_method_identity,
            mrt.*,
            ptrt.translation_default_locale, 
            ptrt.%I,
            ctrt.translation_default_locale, 
            ctrt.%I,
            ct.country_identity,
            ct.country_three_iso_code,
            ct.country_phone_digit,
            ct.country_two_iso_code,
            ct.country_phone_code
    $$,
    p_locale,  -- For ctrt.%I (translation column)
    p_locale,
    p_wallet_it,  -- For pmt.payment_wallet_id = %L
    p_age,  -- For acct.%I (age control column)
    p_locale,  -- For ctrt.%I in GROUP BY
    p_locale
    );

    -- Execute the query and return the result set
    RETURN QUERY EXECUTE sql_query;
END;
$function$

