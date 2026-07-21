-- schema:   public
-- function: submit_or_update_user_profile(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_method_id uuid, p_profile_data jsonb, p_profile_type text, p_buy_status boolean, p_sell_status boolean)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.submit_or_update_user_profile(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_method_id uuid, p_profile_data jsonb, p_profile_type text, p_buy_status boolean DEFAULT false, p_sell_status boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "payment_profile_details": null, "error": null, "called": "119"}';
    profile_details JSONB;
    method_checker TEXT;
    p_profile_id UUID;
    details_id UUID;
    p_buy_active BOOLEAN;
    p_sell_active BOOLEAN;
    old_sell_active BOOLEAN;
    old_buy_active BOOLEAN;
    p_country TEXT;
    all_networks JSONB[];
    n_phone TEXT;
    p_phone TEXT;
    p_network TEXT;
    p_email TEXT;
    n_fullname TEXT;
    p_fullname TEXT;
    p_private_account BOOLEAN;
    p_e_naira BOOLEAN;
    p_direct_debit BOOLEAN;
    p_bank_name TEXT;
    p_bank_code TEXT;
    p_account_number TEXT;
    p_opay BOOLEAN;
    can_insert BOOLEAN := FALSE;
BEGIN

    -- Check if we have valid types 
    IF p_profile_type <> 'ProfileType.buy' AND p_profile_type <> 'ProfileType.sell' AND p_profile_type <> 'ProfileType.both' THEN
        result := jsonb_set(result, '{status}', '"PaymentProfile.no_type"', false);
        RETURN result;
    END IF;
            
    -- This condition seems reversed - it returns if data IS NOT NULL
    IF p_profile_data IS NULL THEN
        result := jsonb_set(result, '{status}', '"PaymentProfile.no_entry"', false);
        RETURN result;
    END IF;

    SELECT ut.users_names, ut.users_email, ut.users_phone
    INTO n_fullname, p_email, n_phone
    FROM users_table ut
    WHERE ut.users_id = p_user_id;

    IF NOT FOUND THEN
        result := jsonb_set(result, '{status}', '"PaymentProfile.no_profile"', false);
        RETURN result;
    END IF;

    -- Check if the payment method exists
    SELECT pmt.payment_method_checker, pmt.payment_method_network, ct.country_two_iso_code INTO method_checker, all_networks, p_country
    FROM payment_method_table pmt
    LEFT JOIN payment_wallet_table pwt ON pwt.payment_wallet_id = pmt.payment_wallet_id
    LEFT JOIN country_table ct ON ct.country_id = pwt.country_id
    WHERE payment_method_id = p_method_id;

    IF method_checker IS NULL THEN
        result := jsonb_set(result, '{status}', '"PaymentProfile.no_method"', false);
        RETURN result;
    END IF;

    -- Insert details data based on the payment method
    CASE method_checker
        WHEN 'PaymentMethod.mobile_money' THEN
            p_fullname := n_fullname;
            p_network := (p_profile_data->>'network')::TEXT;
            p_phone := (p_profile_data->>'phone')::TEXT;
            can_insert := p_phone IS NOT NULL AND 
                     (all_networks IS NULL OR array_length(all_networks, 1) = 0 OR
                      EXISTS (
                         SELECT 1 
                         FROM unnest(all_networks) AS n 
                         WHERE LOWER(n->>'identity') = LOWER(p_network)
                      ));
        WHEN 'PaymentMethod.private_account' THEN
            p_phone := n_phone;
            p_fullname := n_fullname;
            p_private_account := (p_profile_data->>'private_account')::BOOLEAN;
            can_insert := p_phone IS NOT NULL AND p_private_account IS NOT NULL AND p_private_account = TRUE;
        WHEN 'PaymentMethod.e_naira' THEN
            p_fullname := n_fullname;
            p_phone := n_phone;
            p_e_naira := (p_profile_data->>'e_naira')::BOOLEAN;
            can_insert := p_phone IS NOT NULL AND p_e_naira IS NOT NULL AND p_e_naira = TRUE;
        WHEN 'PaymentMethod.direct_debit' THEN
            p_fullname := n_fullname;
            p_phone := n_phone;
            p_direct_debit := (p_profile_data->>'direct_debit')::BOOLEAN;
            can_insert := p_phone IS NOT NULL AND p_direct_debit IS NOT NULL AND p_direct_debit = TRUE;
        WHEN 'PaymentMethod.opay' THEN
            p_fullname := n_fullname;
            p_phone := n_phone;
            p_opay := (p_profile_data->>'opay')::BOOLEAN;
            can_insert := p_phone IS NOT NULL AND p_opay IS NOT NULL AND p_opay = TRUE;
        WHEN 'PaymentMethod.ussd' THEN
            p_fullname := n_fullname;
            p_phone := n_phone;
            p_bank_name := (p_profile_data->>'bank_name')::TEXT;
            p_bank_code := (p_profile_data->>'bank_code')::TEXT;
            can_insert := p_bank_name IS NOT NULL AND p_bank_code IS NOT NULL;
        WHEN 'PaymentMethod.bank_transfer' THEN
            p_fullname := (p_profile_data->>'fullname')::TEXT;
            p_phone := n_phone;
            p_bank_name := (p_profile_data->>'bank_name')::TEXT;
            p_bank_code := (p_profile_data->>'bank_code')::TEXT;
            p_account_number := (p_profile_data->>'account_number')::TEXT;
            can_insert :=  p_fullname IS NOT NULL AND p_bank_name IS NOT NULL AND p_bank_code IS NOT NULL AND p_account_number IS NOT NULL;
        -- More cases for other payment methods 
        ELSE
            -- Handle unsupported payment methods
            result := jsonb_set(result, '{status}', '"PaymentProfile.unsupported_method"', false);
            RETURN result;
    END CASE;

    IF can_insert = FALSE THEN 
        result := jsonb_set(result, '{status}', '"PaymentProfile.incomplete_data"', false);
        RETURN result;
    END IF;

    -- Get profile data based on the payment method extraction
    CASE method_checker
        WHEN 'PaymentMethod.mobile_money' THEN
            SELECT ppt.payment_profile_id, ppt.payment_profile_buy_active, ppt.payment_profile_sell_active
            INTO p_profile_id, old_buy_active, old_sell_active
            FROM payment_profile_table ppt
            JOIN payment_details_table pdt ON pdt.payment_details_id = ppt.payment_details_id
            WHERE pdt.phone = p_phone
            AND ppt.users_id = p_user_id;
        WHEN 'PaymentMethod.private_account' THEN
            SELECT ppt.payment_profile_id, ppt.payment_profile_buy_active, ppt.payment_profile_sell_active
            INTO p_profile_id, old_buy_active, old_sell_active
            FROM payment_profile_table ppt
            JOIN payment_details_table pdt ON pdt.payment_details_id = ppt.payment_details_id
            WHERE pdt.private_account = TRUE
            AND ppt.users_id = p_user_id;
        WHEN 'PaymentMethod.e_naira' THEN
            SELECT ppt.payment_profile_id, ppt.payment_profile_buy_active, ppt.payment_profile_sell_active
            INTO p_profile_id, old_buy_active, old_sell_active
            FROM payment_profile_table ppt
            JOIN payment_details_table pdt ON pdt.payment_details_id = ppt.payment_details_id
            WHERE pdt.e_naira = TRUE
            AND ppt.users_id = p_user_id;
        WHEN 'PaymentMethod.direct_debit' THEN
            SELECT ppt.payment_profile_id, ppt.payment_profile_buy_active, ppt.payment_profile_sell_active
            INTO p_profile_id, old_buy_active, old_sell_active
            FROM payment_profile_table ppt
            JOIN payment_details_table pdt ON pdt.payment_details_id = ppt.payment_details_id
            WHERE pdt.direct_debit = TRUE
            AND ppt.users_id = p_user_id;
        WHEN 'PaymentMethod.opay' THEN
            SELECT ppt.payment_profile_id, ppt.payment_profile_buy_active, ppt.payment_profile_sell_active
            INTO p_profile_id, old_buy_active, old_sell_active
            FROM payment_profile_table ppt
            JOIN payment_details_table pdt ON pdt.payment_details_id = ppt.payment_details_id
            WHERE pdt.opay = TRUE
            AND ppt.users_id = p_user_id;
        WHEN 'PaymentMethod.ussd' THEN
            SELECT ppt.payment_profile_id, ppt.payment_profile_buy_active, ppt.payment_profile_sell_active
            INTO p_profile_id, old_buy_active, old_sell_active
            FROM payment_profile_table ppt
            JOIN payment_details_table pdt ON pdt.payment_details_id = ppt.payment_details_id
            WHERE pdt.bank_code = p_bank_code
            AND ppt.users_id = p_user_id;
        WHEN 'PaymentMethod.bank_transfer' THEN
            SELECT ppt.payment_profile_id, ppt.payment_profile_buy_active, ppt.payment_profile_sell_active
            INTO p_profile_id, old_buy_active, old_sell_active
            FROM payment_profile_table ppt
            JOIN payment_details_table pdt ON pdt.payment_details_id = ppt.payment_details_id
            WHERE pdt.bank_code = p_bank_code AND pdt.account_number = p_account_number
            AND ppt.users_id = p_user_id;
        -- More cases for other payment methods 
        ELSE
            -- Handle unsupported payment methods
            result := jsonb_set(result, '{status}', '"PaymentProfile.unsupported_method"', false);
            RETURN result;
    END CASE;

    -- Insert or update the profile
    IF p_profile_id IS NULL THEN
        IF p_profile_type = 'ProfileType.buy' THEN 
            p_buy_active := p_buy_status;
            p_sell_active := FALSE;
        ELSIF p_profile_type = 'ProfileType.sell' THEN 
            p_buy_active := FALSE;
            p_sell_active := p_sell_status;
        ELSE 
            p_buy_active := p_buy_status;
            p_sell_active := p_sell_status; 
        END IF;

        INSERT INTO payment_details_table(
            phone,
            network,
            email,
            fullname,
            country,
            private_account,
            e_naira,
            direct_debit,
            bank_code,
            bank_name,
            opay,
            account_number
        ) VALUES (
            p_phone,
            p_network,
            p_email,
            p_fullname,
            p_country,
            p_private_account,
            p_e_naira,
            p_direct_debit,
            p_bank_code,
            p_bank_name,
            p_opay,
            p_account_number
        ) RETURNING payment_details_id INTO details_id;

        -- Insert the profile data into the payment profile table
        INSERT INTO payment_profile_table (
            payment_profile_buy_active,
            payment_profile_sell_active,
            payment_method_id,
            users_id,
            payment_details_id
        ) VALUES (
            p_buy_active,
            p_sell_active,
            p_method_id,
            p_user_id,
            details_id
        ) RETURNING payment_profile_id INTO p_profile_id;

        -- Get the profile details   
        SELECT jsonb_build_object(
            'payment_profile_id', ppt.payment_profile_id,
            'sort_created_id',ppt.sort_created_id,
            'payment_method_id', ppt.payment_method_id,
            'payment_details', to_jsonb(pdt) - 'payment_details_id',
            'users_id', ppt.users_id
        ) INTO profile_details
        FROM payment_profile_table ppt
        JOIN payment_details_table pdt ON pdt.payment_details_id = ppt.payment_details_id
        WHERE ppt.payment_profile_id = p_profile_id;
            
    ELSE
        IF p_profile_type = 'ProfileType.buy' THEN 
            p_buy_active := p_buy_status;
            p_sell_active := old_sell_active;
        ELSIF p_profile_type = 'ProfileType.sell' THEN 
            p_buy_active := old_buy_active;
            p_sell_active := p_sell_status;
        ELSE 
            p_buy_active := p_buy_status;
            p_sell_active := p_sell_status;           
        END IF;

        -- Update the profile if it exists and either buy or sell was previously inactive
        IF old_buy_active <> p_buy_active OR old_sell_active <> p_sell_active THEN
            UPDATE payment_profile_table ppt
            SET payment_profile_buy_active = p_buy_active,
                payment_profile_sell_active = p_sell_active
            WHERE payment_profile_id = p_profile_id;
                
            -- Get the updated profile details
            SELECT jsonb_build_object(
                'payment_profile_id', ppt.payment_profile_id,
                'sort_created_id',ppt.sort_created_id,
                'payment_method_id', ppt.payment_method_id,
                'payment_details', to_jsonb(pdt) - 'payment_details_id',
                'users_id', ppt.users_id
            ) INTO profile_details
            FROM payment_profile_table ppt
            JOIN payment_details_table pdt ON pdt.payment_details_id = ppt.payment_details_id
            WHERE ppt.payment_profile_id = p_profile_id;
        ELSE
            result := jsonb_set(result, '{status}', '"PaymentProfile.exists"', false);
            RETURN result;
        END IF;
    END IF;

    -- Check if the insertion or update was successful
    IF profile_details IS NULL THEN
        result := jsonb_set(result, '{status}', '"PaymentProfile.failed"', false);
    ELSE
        result := jsonb_set(result, '{status}', '"PaymentProfile.success"', false);
        result := jsonb_set(result, '{payment_profile_details}', profile_details, false);
    END IF;

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Catch unexpected errors and update the result
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false);
        result := jsonb_set(result, '{status}', '"PaymentProfile.error"', false);
        RETURN result;
END;
$function$

