-- schema:   public
-- function: fetch_withdraw_methods(p_locale text, p_wallet_id uuid, p_limit_by integer, p_after_methods jsonb, p_user_id uuid, p_country text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_withdraw_methods(p_locale text, p_wallet_id uuid, p_limit_by integer, p_after_methods jsonb, p_user_id uuid DEFAULT NULL::uuid, p_country text DEFAULT NULL::text, p_gender text DEFAULT NULL::text, p_age text DEFAULT NULL::text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sortID TEXT;
BEGIN

    sortID := (p_after_methods->>'sort_id')::TEXT;

    RETURN QUERY
    WITH filtered_methods AS (
        SELECT
            pmt.payment_method_id,
            pmt.payment_method_checker,
            pmt.payment_wallet_id,
            pmt.payment_method_image,
            pmt.sort_created_id,
            (
                SELECT array_agg(elem)
                FROM unnest(pmt.payment_method_network) AS elem
                WHERE (elem ->> 'active')::boolean = true
            ) AS payment_method_network,
            pmt.payment_method_identity,
            pmt.payment_method_sell_multiple,
            pmt.payment_method_buy_multiple,
            pmt.payment_method_buy_active,
            pmt.payment_method_sell_active,
            ct.country_id,
            ct.country_identity,
            ct.country_phone_code,
            ct.country_phone_digit
        FROM payment_method_table pmt
        LEFT JOIN payment_wallet_table pwt ON pwt.payment_wallet_id = pmt.payment_wallet_id
        LEFT JOIN country_table ct ON ct.country_id = pwt.country_id
        WHERE 
            pmt.payment_wallet_id = p_wallet_id
            AND pmt.payment_method_sell_active = TRUE  
            AND pwt.country_id IS NOT NULL
            AND (p_age IS NULL OR ((SELECT value FROM decontrol(age_control, p_age, p_locale)) = TRUE))
            AND (sortID IS NULL OR (pmt.sort_created_id)::TEXT > sortID)
        ORDER BY (pmt.sort_created_id)::TEXT ASC
        LIMIT p_limit_by
    )
    SELECT
        jsonb_build_object(
            'payment_method_id', fm.payment_method_id,
            'payment_method_checker', fm.payment_method_checker,
            'payment_wallet_id', fm.payment_wallet_id,
            'payment_method_image', fm.payment_method_image,
            'payment_method_network', fm.payment_method_network,
            'payment_method_sell_multiple', fm.payment_method_sell_multiple,
            'payment_method_buy_multiple', fm.payment_method_buy_multiple,
            'payment_method_buy_active', fm.payment_method_buy_active,
            'payment_method_sell_active', fm.payment_method_sell_active,
            'sort_created_id', fm.sort_created_id,
            'country_id',fm.country_id,
            'country_phone_code',fm.country_phone_code,
            'country_phone_digit',fm.country_phone_digit,
            'country_identity', (translate(fm.country_identity, p_locale)).translation,
            'payment_method_identity', (translate(fm.payment_method_identity, p_locale)).translation
        )
    FROM filtered_methods fm;
END;
$function$

