-- schema:   public
-- function: fetch_user_transactions(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_after_transactions jsonb)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_user_transactions(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_after_transactions jsonb)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    sortID    TEXT;
    direction TEXT;
BEGIN
    sortID    := (p_after_transactions->>'sort_id')::TEXT;
    direction := (p_after_transactions->>'direction')::TEXT;
 
    RETURN QUERY
    WITH filtered_transactions AS (
        SELECT
            tt.transaction_id,
            tt.transaction_created_at,
            tt.transaction_sender_amount,
            tt.transaction_receiver_amount,
            tt.transaction_sender_rate,
            tt.transaction_receiver_rate,
            tt.transaction_fee,
            tt.transaction_type,
            tt.transaction_sender_status,
            tt.transaction_receiver_status,
            tt.transaction_sender_reference,
            tt.sort_created_id,
            tt.pools_id,
            tt.payment_profile_sender_id,
            tt.payment_profile_receiver_id
        FROM transaction_table tt
        -- Join payment profiles once here to find the user's transactions
        JOIN payment_profile_table sppt ON sppt.payment_profile_id = tt.payment_profile_sender_id
        JOIN payment_profile_table rppt ON rppt.payment_profile_id = tt.payment_profile_receiver_id
        WHERE
            (sppt.users_id = p_user_id OR rppt.users_id = p_user_id)
            -- Pagination filter applied HERE so LIMIT sees only valid cursor rows
            AND (sortID IS NULL OR (
                (direction = 'oldest' AND tt.sort_created_id::TEXT < sortID)
                OR
                (direction = 'latest' AND tt.sort_created_id::TEXT > sortID)
            ))
        ORDER BY
            CASE WHEN direction = 'oldest' OR direction IS NULL THEN tt.sort_created_id::TEXT ELSE NULL END DESC,
            CASE WHEN direction = 'latest'                      THEN tt.sort_created_id::TEXT ELSE NULL END ASC
        LIMIT p_limit_by
    )
    SELECT jsonb_build_object(
        'transaction_id',                ft.transaction_id,
        'transaction_created_at',        ft.transaction_created_at,
        'transaction_sender_amount',     ft.transaction_sender_amount,
        'transaction_receiver_amount',   ft.transaction_receiver_amount,
        'transaction_sender_rate',       ft.transaction_sender_rate,
        'transaction_receiver_rate',     ft.transaction_receiver_rate,
        'transaction_fee',               ft.transaction_fee,
        'transaction_type',              ft.transaction_type,
        'transaction_sender_status',     ft.transaction_sender_status,
        'transaction_receiver_status',   ft.transaction_receiver_status,
        'transaction_sender_reference',  ft.transaction_sender_reference,
        'payment_profile_sender_details', jsonb_build_object(
            'users_details', jsonb_build_object(
                'users_id',       surt.users_id,
                -- COALESCE: prefer user name, fall back to translated method identity (computed once)
                'users_names',    COALESCE(surt.users_names, (SELECT translation FROM translate(spmt.payment_method_identity, p_locale))),
                'payment_details', (to_jsonb(spdt) - 'payment_details_id')
            ),
            'payment_wallet_details', jsonb_build_object(
                'payment_wallet_id',       spwt.payment_wallet_id,
                'payment_wallet_currency', spwt.payment_wallet_currency,
                'payment_wallet_identity', spwt.payment_wallet_identity
            ),
            'payment_method_details', jsonb_build_object(
                'payment_method_id',      spmt.payment_method_id,
                'payment_method_checker', spmt.payment_method_checker,
                -- Single translate() call — not duplicated
                'payment_method_identity', (SELECT translation FROM translate(spmt.payment_method_identity, p_locale))
            )
        ),
        'payment_profile_receiver_details', jsonb_build_object(
            'users_details', jsonb_build_object(
                'users_id',       rurt.users_id,
                'users_names',    COALESCE(rurt.users_names, (SELECT translation FROM translate(rpmt.payment_method_identity, p_locale))),
                'payment_details', (to_jsonb(rpdt) - 'payment_details_id')
            ),
            'payment_wallet_details', jsonb_build_object(
                'payment_wallet_id',       rpwt.payment_wallet_id,
                'payment_wallet_currency', rpwt.payment_wallet_currency,
                'payment_wallet_identity', rpwt.payment_wallet_identity
            ),
            'payment_method_details', jsonb_build_object(
                'payment_method_id',      rpmt.payment_method_id,
                'payment_method_checker', rpmt.payment_method_checker,
                'payment_method_identity', (SELECT translation FROM translate(rpmt.payment_method_identity, p_locale))
            )
        ),
        'sort_created_id', ft.sort_created_id,
        'pools_id',        ft.pools_id
    )
    FROM filtered_transactions ft
    -- Single join to payment_profile_table per side (not duplicated from CTE)
    JOIN  payment_profile_table  sppt ON sppt.payment_profile_id = ft.payment_profile_sender_id
    LEFT JOIN users_table        surt ON surt.users_id            = sppt.users_id
    LEFT JOIN payment_method_table spmt ON spmt.payment_method_id = sppt.payment_method_id
    LEFT JOIN payment_wallet_table spwt ON spwt.payment_wallet_id = spmt.payment_wallet_id
    LEFT JOIN payment_details_table spdt ON spdt.payment_details_id = sppt.payment_details_id
 
    JOIN  payment_profile_table  rppt ON rppt.payment_profile_id = ft.payment_profile_receiver_id
    LEFT JOIN users_table        rurt ON rurt.users_id            = rppt.users_id
    LEFT JOIN payment_method_table rpmt ON rpmt.payment_method_id = rppt.payment_method_id
    LEFT JOIN payment_wallet_table rpwt ON rpwt.payment_wallet_id = rpmt.payment_wallet_id
    LEFT JOIN payment_details_table rpdt ON rpdt.payment_details_id = rppt.payment_details_id
 
    ORDER BY
        CASE WHEN direction = 'oldest' OR direction IS NULL THEN ft.sort_created_id::TEXT ELSE NULL END DESC,
        CASE WHEN direction = 'latest'                      THEN ft.sort_created_id::TEXT ELSE NULL END ASC;
END;
$function$

