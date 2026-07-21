-- schema:   public
-- function: handle_user_payment(p_user_id uuid, p_sender_profile_id uuid, p_receiver_profile_id uuid, p_amount numeric, p_type text, p_locale text, p_country text, p_gender text, p_age text, p_payment_session_id text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.handle_user_payment(p_user_id uuid, p_sender_profile_id uuid, p_receiver_profile_id uuid, p_amount numeric, p_type text, p_locale text, p_country text, p_gender text, p_age text, p_payment_session_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    -- Result object
    result JSONB := jsonb_build_object(
        'status', null,
        'error', null,
        'transaction_details', null,
        'transfer_profile', null,
        'transfer_method', null,
        'transfer_type', null,
        'transfer_amount', null,
        'transfer_currency', null,
        'transfer_reference', null,
        'transfer_time_out', null
    );

    -- Constants
    main_wallet CONSTANT TEXT := 'PaymentMethod.academix_coin';

    -- Profile and wallet info
    has_main_wallet BOOLEAN;
    transfer_method TEXT;
    transfer_time_out INT;
    s_user_id UUID;
    r_user_id UUID;
    s_method TEXT;
    r_method TEXT;
    s_sell_rate NUMERIC;
    s_buy_rate NUMERIC;
    s_min NUMERIC;
    s_currency TEXT;
    r_sell_rate NUMERIC;
    r_buy_rate NUMERIC;
    r_min NUMERIC;
    r_currency TEXT;

    -- SENDER
    s_details_id UUID;
    s_wallet_id UUID;
    s_wallet_identity TEXT;
    s_method_id UUID;
    s_method_identity JSONB;
    s_time_out INT;
    s_wallet_rate_type TEXT;
    s_wallet_fee NUMERIC;
    s_fee_flat NUMERIC;  -- flat floor for RateType.FUNCTION (buy/top-up)

    -- RECEIVER
    r_details_id UUID;
    r_wallet_id UUID;
    r_wallet_identity TEXT;
    r_method_id UUID;
    r_method_identity JSONB;
    r_time_out INT;
    r_wallet_rate_type TEXT;
    r_wallet_fee NUMERIC;
    r_fee_flat NUMERIC;  -- flat floor for RateType.FUNCTION (sell/withdraw)

    -- Balance
    balance_amount NUMERIC;
    referral_block TIMESTAMPTZ;
    new_balance NUMERIC;

    -- Transaction
    which_account TEXT;
    transfer_amount NUMERIC;
    transfer_currency TEXT;
    transfer_reference TEXT;
    transfer_profile JSONB;
    debit_type TEXT := 'none';
    insert_fee NUMERIC;
    insert_sender_amount NUMERIC;
    insert_receiver_amount NUMERIC;
    insert_sender_rate NUMERIC;
    insert_receiver_rate NUMERIC;
    insert_sender_status TEXT;
    insert_receiver_status TEXT;
    transaction_details JSONB;
    sender_reference TEXT;
    receiver_reference TEXT;
    sender_details JSONB;
    receiver_details JSONB;

BEGIN
    -- [1] Validate amount
    IF p_amount <= 0 THEN
        result := jsonb_set(result, '{status}', '"Payment.invalid_amount"');
        RETURN result;
    END IF;

    -- [2] Load sender/receiver data
    SELECT 
        sender_profile.users_id,
        sender_method.payment_method_checker,
        sender_wallet.payment_wallet_buy_rate,
        sender_wallet.payment_wallet_sell_rate,
        sender_wallet.payment_wallet_buy_min,
        sender_wallet.payment_wallet_currency,
        sender_profile.payment_details_id,
        sender_wallet.payment_wallet_id,
        sender_wallet.payment_wallet_identity,
        sender_wallet.payment_wallet_buy_rate_type,
        sender_wallet.payment_wallet_buy_fee,
        sender_wallet.payment_wallet_buy_fee_flat,   -- FIX: populate s_fee_flat
        sender_method.payment_method_id,
        sender_method.payment_method_identity,
        sender_method.payment_method_time_out,

        receiver_profile.users_id,
        receiver_method.payment_method_checker,
        receiver_wallet.payment_wallet_buy_rate,
        receiver_wallet.payment_wallet_sell_rate,
        receiver_wallet.payment_wallet_buy_min,
        receiver_wallet.payment_wallet_currency,
        receiver_profile.payment_details_id,
        receiver_wallet.payment_wallet_id,
        receiver_wallet.payment_wallet_identity,
        receiver_wallet.payment_wallet_sell_rate_type,
        receiver_wallet.payment_wallet_sell_fee,
        receiver_wallet.payment_wallet_sell_fee_flat,  -- FIX: populate r_fee_flat
        receiver_method.payment_method_id,
        receiver_method.payment_method_identity,
        receiver_method.payment_method_time_out

    INTO
        -- sender
        s_user_id, s_method, s_buy_rate, s_sell_rate, s_min, s_currency,
        s_details_id, s_wallet_id, s_wallet_identity, s_wallet_rate_type, s_wallet_fee, s_fee_flat,
        s_method_id, s_method_identity, s_time_out,

        -- receiver
        r_user_id, r_method, r_buy_rate, r_sell_rate, r_min, r_currency,
        r_details_id, r_wallet_id, r_wallet_identity, r_wallet_rate_type, r_wallet_fee, r_fee_flat,
        r_method_id, r_method_identity, r_time_out

    FROM 
        payment_profile_table sender_profile
        LEFT JOIN payment_method_table sender_method 
            ON sender_method.payment_method_id = sender_profile.payment_method_id
        LEFT JOIN payment_wallet_table sender_wallet
            ON sender_wallet.payment_wallet_id = sender_method.payment_wallet_id,
        payment_profile_table receiver_profile
        LEFT JOIN payment_method_table receiver_method
            ON receiver_method.payment_method_id = receiver_profile.payment_method_id
        LEFT JOIN payment_wallet_table receiver_wallet
            ON receiver_wallet.payment_wallet_id = receiver_method.payment_wallet_id
    WHERE
        sender_profile.payment_profile_id = p_sender_profile_id
        AND receiver_profile.payment_profile_id = p_receiver_profile_id;

    IF NOT FOUND THEN
        result := jsonb_set(result, '{status}', '"Payment.profile_not_found"');
        RETURN result;
    END IF;

    -- [3] Access control
    IF r_user_id <> p_user_id AND s_user_id <> p_user_id THEN
        result := jsonb_set(result, '{status}', '"Payment.not_allowed"');
        RETURN result;
    END IF;

    -- [4] Validate wallet fields
    IF s_currency IS NULL OR r_currency IS NULL OR s_buy_rate IS NULL OR r_buy_rate IS NULL THEN
        result := jsonb_set(result, '{status}', '"Payment.incomplete_wallet_data"');
        RETURN result;
    END IF;

    -- [6] Get balance
    SELECT COALESCE(users_balance_amount, 0.0), users_balance_referral_block
    INTO balance_amount, referral_block
    FROM personal.users_balance_table
    WHERE users_id = p_user_id
    FOR UPDATE;

    -- [7] Transaction logic
    has_main_wallet := (s_method = main_wallet AND r_method = main_wallet);
    CASE p_type
        WHEN 'TransactionType.quiz' THEN
            IF s_user_id = p_user_id AND has_main_wallet = TRUE THEN 
                new_balance := balance_amount - p_amount;
                insert_sender_amount := -p_amount;
                insert_receiver_amount := p_amount;
                insert_sender_rate := 1.0;
                insert_receiver_rate := 1.0;
                insert_fee := 0.0;
                transfer_amount := p_amount;
                insert_sender_status := 'TransactionStatus.success';
                insert_receiver_status := 'TransactionStatus.pending';
                debit_type := 'normal';
                which_account := 'sender';
                transfer_method := s_method;
                transfer_time_out := s_time_out;
            END IF;

        WHEN 'TransactionType.participation' THEN
            IF r_user_id = p_user_id AND has_main_wallet = TRUE THEN 
                new_balance := balance_amount + p_amount;
                insert_sender_amount := -p_amount;
                insert_receiver_amount := p_amount;
                insert_sender_rate := 1.0;
                insert_receiver_rate := 1.0;
                insert_fee := 0.0;
                transfer_amount := p_amount;
                insert_sender_status := 'TransactionStatus.success';
                insert_receiver_status := 'TransactionStatus.success';
                which_account := 'receiver';
                transfer_method := r_method;
                transfer_time_out := r_time_out;
            END IF;

        WHEN 'TransactionType.top_up' THEN
            IF s_user_id = p_user_id AND s_details_id IS NOT NULL AND has_main_wallet = FALSE AND r_method = main_wallet THEN
                -- FIX: pass s_fee_flat so RateType.FUNCTION is evaluated correctly
                insert_fee := calculate_amount_with_fee(p_amount, s_wallet_rate_type, s_wallet_fee, s_fee_flat);
                new_balance := balance_amount + (s_buy_rate * p_amount);
                insert_sender_amount := p_amount;
                transfer_amount := p_amount + insert_fee;
                insert_receiver_amount := (s_buy_rate * p_amount);
                insert_sender_rate := s_buy_rate;
                insert_receiver_rate := r_buy_rate;
                insert_sender_status := 'TransactionStatus.pending';
                insert_receiver_status := 'TransactionStatus.pending';
                which_account := 'sender';
                transfer_method := s_method;
                transfer_time_out := s_time_out;
            END IF;


        WHEN 'TransactionType.buy_in' THEN
            IF s_user_id = p_user_id AND s_details_id IS NOT NULL AND has_main_wallet = FALSE AND r_method = main_wallet THEN
                -- FIX: pass s_fee_flat so RateType.FUNCTION is evaluated correctly
                insert_fee := calculate_amount_with_fee(p_amount, s_wallet_rate_type, s_wallet_fee, s_fee_flat);
                new_balance := balance_amount + (s_buy_rate * p_amount);
                insert_sender_amount := p_amount;
                transfer_amount := p_amount + insert_fee;
                insert_receiver_amount := (s_buy_rate * p_amount);
                insert_sender_rate := s_buy_rate;
                insert_receiver_rate := r_buy_rate;
                insert_sender_status := 'TransactionStatus.pending';
                insert_receiver_status := 'TransactionStatus.pending';
                which_account := 'sender';
                transfer_method := s_method;
                transfer_time_out := s_time_out;
            END IF;

        WHEN 'TransactionType.withdraw' THEN
            IF r_user_id = p_user_id AND r_details_id IS NOT NULL AND has_main_wallet = FALSE AND s_method = main_wallet THEN
                -- FIX: pass r_fee_flat so RateType.FUNCTION is evaluated correctly
                insert_fee := calculate_amount_with_fee(p_amount, r_wallet_rate_type, r_wallet_fee, r_fee_flat) * r_sell_rate;
                new_balance := balance_amount - (r_sell_rate * p_amount) - insert_fee;
                insert_sender_amount := ((r_sell_rate * p_amount)) * -1;
                insert_receiver_amount := p_amount;
                transfer_amount := p_amount;
                insert_sender_rate := r_sell_rate;
                insert_receiver_rate := s_sell_rate;
                insert_sender_status := 'TransactionStatus.pending';
                insert_receiver_status := 'TransactionStatus.pending';
                debit_type := 'risk';
                which_account := 'receiver';
                transfer_method := r_method;
                transfer_time_out := r_time_out;
            END IF;

        ELSE
            result := jsonb_set(result, '{status}', '"Payment.invalid_transaction_type"');
            RETURN result;
    END CASE;

    -- [8] Balance checks
    IF (debit_type = 'normal' OR debit_type = 'risk') AND new_balance < 0 THEN
        result := jsonb_set(result, '{status}', '"Payment.insufficient_balance"');
        RETURN result;
    END IF;

    IF debit_type = 'risk' AND referral_block IS NOT NULL 
    -- AND referral_block >= NOW() 
    THEN 
        result := jsonb_set(result, '{status}', '"Payment.temporary_block"');
        RETURN result;
    END IF;

    -- [9] Execute transaction
    IF insert_sender_amount IS NOT NULL AND insert_receiver_amount IS NOT NULL AND insert_fee IS NOT NULL
       AND insert_sender_rate > 0 AND insert_receiver_rate > 0 AND transfer_amount > 0 THEN

        -- GET DETAILS
        -- Sender
        SELECT to_jsonb(payment_details_table) - 'payment_details_id' 
        INTO sender_details
        FROM payment_details_table     
        WHERE payment_details_id = s_details_id;

        -- Receiver
        SELECT to_jsonb(payment_details_table) - 'payment_details_id' 
        INTO receiver_details
        FROM payment_details_table     
        WHERE payment_details_id = r_details_id;

        INSERT INTO transaction_table (
            transaction_sender_amount,
            transaction_receiver_amount,
            transaction_sender_status,
            transaction_receiver_status,
            transaction_sender_rate,
            transaction_receiver_rate,
            transaction_fee,
            transaction_type,
            payment_profile_sender_id,
            payment_profile_receiver_id,
            users_balance_old_amount,
            users_balance_new_amount
        ) VALUES (
            insert_sender_amount,
            insert_receiver_amount,
            insert_sender_status,
            insert_receiver_status,
            insert_sender_rate,
            insert_receiver_rate,
            insert_fee,
            p_type,
            p_sender_profile_id,
            p_receiver_profile_id,
            balance_amount,
            new_balance
        )
        RETURNING jsonb_build_object(
            'transaction_id', transaction_id,
            'transaction_created_at', transaction_created_at,
            'transaction_sender_amount', transaction_sender_amount,
            'transaction_receiver_amount', transaction_receiver_amount,
            'transaction_sender_rate', transaction_sender_rate,
            'transaction_receiver_rate', transaction_receiver_rate,
            'transaction_fee', transaction_fee,
            'transaction_type', transaction_type,
            'transaction_sender_status', transaction_sender_status,
            'transaction_receiver_status', transaction_receiver_status,
            'transaction_sender_reference', transaction_sender_reference,
            'payment_profile_sender_details', jsonb_build_object(
                'users_details', jsonb_build_object(
                    'users_id', s_user_id,
                    'users_names', (
                        SELECT COALESCE(sut.users_names, (SELECT translation FROM translate(s_method_identity, p_locale)))
                        FROM users_table sut
                        WHERE sut.users_id = s_user_id
                    ),
                    'payment_details', sender_details
                ),
                'payment_wallet_details', jsonb_build_object(
                    'payment_wallet_id', s_wallet_id,
                    'payment_wallet_currency', s_currency,
                    'payment_wallet_identity', s_wallet_identity
                ),
                'payment_method_details', jsonb_build_object(
                    'payment_method_id', s_method_id,
                    'payment_method_checker', s_method,
                    'payment_method_identity', (SELECT translation FROM translate(s_method_identity, p_locale))
                )
            ),
            'payment_profile_receiver_details', jsonb_build_object(
                'users_details', jsonb_build_object(
                    'users_id', r_user_id,
                    'users_names', (
                        SELECT COALESCE(rut.users_names, (SELECT translation FROM translate(r_method_identity, p_locale)))
                        FROM users_table rut
                        WHERE rut.users_id = r_user_id
                    ),
                    'payment_details', receiver_details
                ),
                'payment_wallet_details', jsonb_build_object(
                    'payment_wallet_id', r_wallet_id,
                    'payment_wallet_currency', r_currency,
                    'payment_wallet_identity', r_wallet_identity
                ),
                'payment_method_details', jsonb_build_object(
                    'payment_method_id', r_method_id,
                    'payment_method_checker', r_method,
                    'payment_method_identity', (SELECT translation FROM translate(r_method_identity, p_locale))
                )
            ),
            'sort_created_id', sort_created_id,
            'pools_id', null
        ), transaction_sender_reference, transaction_receiver_reference
        INTO transaction_details, sender_reference, receiver_reference;

        IF transaction_details IS NOT NULL THEN

            IF which_account = 'sender' THEN 
                transfer_currency := s_currency;
                transfer_reference := sender_reference;
                transfer_profile := sender_details;
            ELSIF which_account = 'receiver' THEN
                transfer_currency := r_currency;
                transfer_reference := receiver_reference;
                transfer_profile := receiver_details;
            ELSE 
                transfer_currency := NULL;
                transfer_reference := NULL;
                transfer_profile := NULL;
            END IF;

            IF transfer_profile IS NOT NULL THEN
                result := jsonb_set(result, '{transfer_profile}', to_jsonb(transfer_profile));
            END IF;

            IF transfer_reference IS NOT NULL THEN
                result := jsonb_set(result, '{transfer_reference}', to_jsonb(transfer_reference));
            END IF;

            IF transfer_currency IS NOT NULL THEN
                result := jsonb_set(result, '{transfer_currency}', to_jsonb(transfer_currency));
            END IF;

            result := jsonb_set(result, '{transfer_amount}', to_jsonb(transfer_amount));
            result := jsonb_set(result, '{transfer_type}', to_jsonb(p_type));
            result := jsonb_set(result, '{transfer_time_out}', to_jsonb(transfer_time_out));
            result := jsonb_set(result, '{transfer_method}', to_jsonb(transfer_method));
            result := jsonb_set(result, '{transaction_details}', transaction_details);
            result := jsonb_set(result, '{status}', '"Payment.success"');
        ELSE
            result := jsonb_set(result, '{status}', '"Payment.error"');
        END IF;
    ELSE
        result := jsonb_set(result, '{status}', '"Payment.process_cancelled"');
    END IF;

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Payment Error: %', SQLERRM;
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM));
        result := jsonb_set(result, '{status}', '"Payment.failed"');
        RETURN result;
END;
$function$

