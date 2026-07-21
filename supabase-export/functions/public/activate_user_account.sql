-- schema:   public
-- function: activate_user_account(p_user_id uuid, p_transaction_id uuid, p_amount numeric, p_type text, p_status text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.activate_user_account(p_user_id uuid, p_transaction_id uuid, p_amount numeric, p_type text, p_status text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    buy_in_required_amount NUMERIC;
BEGIN
    -- Only act on a confirmed buy_in
    IF p_status <> 'TransactionStatus.success' THEN
        IF p_type = 'TransactionType.buy_in' THEN
            UPDATE users_table
            SET
                transaction_id   = p_transaction_id,
                users_updated_at = NOW()
            WHERE users_id = p_user_id;  -- ← semicolon added
        END IF;
        RETURN;
    END IF;

    SELECT rt.roles_buy_in
    INTO   buy_in_required_amount
    FROM   users_table ut
    LEFT   JOIN roles_table rt ON rt.roles_id = ut.roles_id
    WHERE  ut.users_id = p_user_id;

    IF buy_in_required_amount IS NULL THEN
        RAISE NOTICE 'activate_user_account: no role found for user %', p_user_id;
        RETURN;
    END IF;

    -- Amount must meet or exceed the role's required buy-in
    IF (p_amount + 1) < buy_in_required_amount THEN
        RAISE NOTICE 'activate_user_account: amount % does not match required % for user %',
            p_amount, buy_in_required_amount, p_user_id;
        RETURN;
    END IF;

    UPDATE users_table
    SET
        users_active        = TRUE,
        users_activation_at = NOW(),
        transaction_id   = p_transaction_id,
        users_updated_at    = NOW()
    WHERE users_id  = p_user_id
      AND users_active = FALSE;  -- idempotent: skip if already active

    IF NOT FOUND THEN
        RAISE NOTICE 'activate_user_account: user % already active or not found', p_user_id;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'activate_user_account error for user %: %', p_user_id, SQLERRM;
END;
$function$

