-- schema:   public
-- function: charge_user_quiz_pool(p_user_id uuid, p_challenge_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_redeem_code text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.charge_user_quiz_pool(p_user_id uuid, p_challenge_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_redeem_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result              JSONB := '{"status": null, "error": null, "redeemable_id": null,
                                   "transaction_details": null, "redeem_code_id": null, "called": "117"}';
    quiz_amount         INT;
    code_amount         INT;
    pay_amount          INT;
    sender_profile      JSONB;
    receiver_profile    JSONB;
    redeem_id           UUID;
    redeem_rule_id      UUID;
    redeemed_id         UUID;       -- existing redeemable row for this user+code
    transaction_details JSONB;
    p_redeemable_id     UUID;
    user_redeem_id      UUID;
BEGIN
 
    RAISE LOG 'charge_user_quiz_pool called - user: %, challenge: %, has_redeem_code: %',
              p_user_id, p_challenge_id, p_redeem_code;
 
    -- ── [1] Fetch challenge price ─────────────────────────────────────────────
    SELECT ct.challenge_price
    INTO quiz_amount
    FROM challenge_table ct
    WHERE ct.challenge_id = p_challenge_id;
 
    IF quiz_amount IS NULL THEN
        result := jsonb_set(result, '{status}', '"Payment.invalid_challenge"');
        result := jsonb_set(result, '{error}',  '"Challenge not found or invalid price"');
        RETURN result;
    END IF;
 
    IF quiz_amount < 0 THEN
        result := jsonb_set(result, '{status}', '"Payment.invalid_price"');
        result := jsonb_set(result, '{error}',  '"Challenge price cannot be negative"');
        RETURN result;
    END IF;
 
    -- ── [2] Redeem code logic ─────────────────────────────────────────────────
    IF p_redeem_code IS NOT NULL THEN
 
        -- Code must belong to this exact user (users_id NOT NULL now).
        SELECT rct.redeem_code_amount, rct.redeem_code_id, rct.redeem_code_rule_id
        INTO code_amount, redeem_id, redeem_rule_id
        FROM redeem_code_table rct
        WHERE rct.redeem_code_value  = p_redeem_code
          AND rct.users_id           = p_user_id          -- strict ownership
          AND rct.redeem_code_active = TRUE
          AND (rct.redeem_code_expires IS NULL OR rct.redeem_code_expires > NOW())
        FOR UPDATE;
 
        IF redeem_id IS NOT NULL THEN
 
            -- Single-use guard: if a successful redeemable row already exists, block.
            SELECT rt.redeemable_id
            INTO redeemed_id
            FROM redeemable_table rt
            WHERE rt.redeem_code_id = redeem_id
              AND rt.users_id       = p_user_id
            LIMIT 1;
 
            IF redeemed_id IS NOT NULL THEN
                -- Code already used — pay full price without discount.
                pay_amount := quiz_amount;
                redeem_id  := NULL;     -- treat as if no code was supplied
            ELSE
                pay_amount := quiz_amount - code_amount;
            END IF;
        ELSE
            -- Code not found or not owned by this user.
            pay_amount := quiz_amount;
        END IF;
    ELSE
        pay_amount := quiz_amount;
    END IF;
 
    -- ── [3] Payment ───────────────────────────────────────────────────────────
    IF pay_amount > 0 THEN
 
        SELECT * INTO sender_profile
        FROM create_or_get_academix_profile(p_user_id, p_locale, p_country, p_gender, p_age);
 
        IF sender_profile IS NULL THEN
            result := jsonb_set(result, '{status}', '"Payment.profile_error"');
            result := jsonb_set(result, '{error}',  '"Failed to create or retrieve sender profile"');
            RETURN result;
        END IF;
 
        SELECT * INTO receiver_profile
        FROM create_or_get_wallet_profile(p_user_id, p_locale, p_country, p_gender, p_age);
 
        IF receiver_profile IS NULL THEN
            result := jsonb_set(result, '{status}', '"Payment.profile_error"');
            result := jsonb_set(result, '{error}',  '"Failed to create or retrieve receiver profile"');
            RETURN result;
        END IF;
 
        SELECT * FROM handle_user_payment(
            p_user_id,
            (sender_profile  ->>'payment_profile_id')::UUID,
            (receiver_profile->>'payment_profile_id')::UUID,
            pay_amount,
            'TransactionType.quiz',
            p_locale, p_country, p_gender, p_age,
            ''
        ) INTO transaction_details;
 
        IF transaction_details IS NULL THEN
            result := jsonb_set(result, '{status}', '"Payment.handler_error"');
            result := jsonb_set(result, '{error}',  '"Payment handler returned null response"');
            RETURN result;
        END IF;
 
        IF (transaction_details->'transaction_details'->>'transaction_id')::UUID IS NOT NULL
           AND (transaction_details->>'status') = 'Payment.success' THEN
 
            -- Mark the redeem code as used (only if it was valid and owned)
            IF redeem_id IS NOT NULL THEN
                INSERT INTO redeemable_table (redeem_code_id, users_id, redeemable_status)
                VALUES (redeem_id, p_user_id, 'RedeemableStatus.pending')
                RETURNING redeemable_id INTO p_redeemable_id;
 
                result := jsonb_set(result, '{redeemable_id}', to_jsonb(p_redeemable_id));
            END IF;
 
            result := jsonb_set(result, '{transaction_details}',
                (transaction_details->'transaction_details')::JSONB);
 
            IF transaction_details->>'status' IS NOT NULL THEN
                result := jsonb_set(result, '{status}',
                    to_jsonb(transaction_details->>'status'));
            END IF;
 
        ELSE
            IF transaction_details->>'status' IS NOT NULL THEN
                result := jsonb_set(result, '{status}',
                    to_jsonb(transaction_details->>'status'));
            END IF;
            IF transaction_details->>'error' IS NOT NULL THEN
                result := jsonb_set(result, '{error}',
                    to_jsonb(transaction_details->>'error'));
            END IF;
            IF transaction_details->>'called' IS NOT NULL THEN
                result := jsonb_set(result, '{called}',
                    to_jsonb(transaction_details->>'called'));
            END IF;
        END IF;
 
    ELSIF pay_amount <= 0 THEN
        -- Free or fully covered by redeem code
        IF redeem_id IS NOT NULL THEN
            IF pay_amount < 0 THEN
                -- Overshoot: issue a new code for the surplus
                SELECT * FROM create_user_redeem_code(p_user_id, (-1 * pay_amount), redeem_rule_id)
                INTO user_redeem_id;
            END IF;
 
            INSERT INTO redeemable_table (redeem_code_id, users_id, redeemable_status)
            VALUES (redeem_id, p_user_id, 'RedeemableStatus.pending')
            RETURNING redeemable_id INTO p_redeemable_id;
 
            IF user_redeem_id IS NOT NULL THEN
                result := jsonb_set(result, '{redeem_code_id}', to_jsonb(user_redeem_id));
            END IF;
 
            result := jsonb_set(result, '{redeemable_id}', to_jsonb(p_redeemable_id));
        END IF;
 
        result := jsonb_set(result, '{status}', '"Payment.success"');
    END IF;
 
    RETURN result;
 
EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_set(result, '{error}',  to_jsonb(SQLERRM));
        result := jsonb_set(result, '{status}', '"Payment.failed"');
        IF result IS NULL THEN
            result := jsonb_build_object('status', 'Payment.failed', 'error', SQLERRM);
        END IF;
        RETURN result;
END;
$function$

