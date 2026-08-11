CREATE OR REPLACE FUNCTION public.fetch_user_activation_role(p_user_id uuid DEFAULT NULL, p_locale text DEFAULT '')
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result            JSONB;
    v_activation_status BOOLEAN;
BEGIN
    -- Browser callers may never name a user: p_user_id is overwritten with auth.uid() unless the
    -- caller is service_role (the content Lambdas' assert_can_contribute path, which passes an
    -- already-verified id). Previously the client SENT its own id and a guard compared the two; now
    -- the value is not expressible from a browser at all, so there is nothing to spoof or compare.
    IF NOT (coalesce(auth.jwt()->>'role', '') = 'service_role' OR session_user IN ('service_role', 'postgres')) THEN
        p_user_id := auth.uid();
    END IF;

    -- Guard: caller must be authenticated as themselves (IS DISTINCT FROM is NULL-safe for anon
    -- callers). This response includes buy-in amount and transaction_id, so an unguarded p_user_id
    -- would leak another user's financial details.
    IF p_user_id IS DISTINCT FROM auth.uid() THEN
        RETURN NULL;
    END IF;

    -- Resolve once, reuse twice
    SELECT * INTO v_activation_status
    FROM fetch_user_activation_status(p_user_id);

    SELECT jsonb_build_object(
        'roles_details', jsonb_build_object(
            'roles_id',         rt.roles_id,
            'roles_checker',    rt.roles_checker,
            'roles_level',      rt.roles_level,
            'roles_created_at', rt.roles_created_at,
            'roles_buy_in',       CASE
    WHEN v_activation_status THEN ROUND(COALESCE(tt.transaction_receiver_amount, 0),2)
    ELSE rt.roles_buy_in
END,
            'roles_identity',   (SELECT translation FROM translate(rt.roles_identity, p_locale)),
            'roles_perks',      COALESCE(
                                    rt.roles_perks->p_locale,
                                    rt.roles_perks->'en',
                                    '[]'::JSONB
                                )
        ),
        'roles_activation_details', jsonb_build_object(
            'roles_activation_amount', CASE
    WHEN v_activation_status THEN 0
    ELSE ROUND(rt.roles_buy_in - COALESCE(tt.transaction_receiver_amount, 0), 2)
END,
            'roles_activation_activated', v_activation_status,
            'transaction_id',             tt.transaction_id,
            'roles_activation_is_fresh',  CASE                               -- âœ“ CASE replaces ? :
                                              WHEN v_activation_status THEN FALSE
                                              ELSE COALESCE(
                                                  (
                                                      tt.transaction_sender_status   = 'TransactionStatus.failed'
                                                      OR
                                                      tt.transaction_receiver_status = 'TransactionStatus.failed'  -- âœ“ closed quote
                                                  ),
                                                  TRUE
                                              )
                                          END
        )
    )
    INTO v_result
    FROM        users_table       ut
    LEFT JOIN   roles_table       rt ON rt.roles_id      = ut.roles_id
    LEFT JOIN   transaction_table tt ON tt.transaction_id = ut.transaction_id
    WHERE ut.users_id = p_user_id;

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'fetch_user_activation_role error for user %: %', p_user_id, SQLERRM;
        RETURN NULL;
END;
$function$
