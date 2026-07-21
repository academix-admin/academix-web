-- schema:   public
-- function: fetch_user_activation_status(p_user_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_user_activation_status(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result BOOLEAN;
BEGIN
    SELECT
        -- Active flag must be TRUE
        ut.users_active = TRUE
        AND
        (
            rt.roles_checker = 'Roles.student'
            OR (
                rt.roles_checker <> 'Roles.student'
                -- Confirming transaction amount must meet the role's buy-in threshold
                AND (tt.transaction_receiver_amount + 1) >= rt.roles_buy_in
                -- Transaction must be confirmed by the provider
                AND tt.transaction_sender_status   = 'TransactionStatus.success'
                AND tt.transaction_receiver_status = 'TransactionStatus.success'
            )
        )

    INTO v_result
    FROM        users_table       ut
    LEFT JOIN   roles_table       rt ON rt.roles_id      = ut.roles_id
    LEFT JOIN   transaction_table tt ON tt.transaction_id = ut.transaction_id
                                    AND tt.transaction_type = 'TransactionType.buy_in'
    WHERE ut.users_id = p_user_id;

    -- If no row found return FALSE rather than NULL
    RETURN COALESCE(v_result, FALSE);

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'fetch_user_activation_status error for user %: %', p_user_id, SQLERRM;
        RETURN FALSE;
END;
$function$

