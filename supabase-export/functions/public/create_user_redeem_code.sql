-- schema:   public
-- function: create_user_redeem_code(p_user_id uuid, p_amount integer, p_rule_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.create_user_redeem_code(p_user_id uuid, p_amount integer, p_rule_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_code TEXT;
    code_value TEXT;
    redeem_code UUID;
    max_attempts INT := 1000; -- Safeguard to prevent infinite loops
    attempts INT := 0;
BEGIN
    -- Loop to generate a unique code
    WHILE attempts < max_attempts LOOP
        -- Generate a random 7-character alphanumeric code
        new_code := (
            SELECT string_agg(
                substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', (random() * 36 + 1)::int, 1), ''
            ) 
            FROM generate_series(1, 7)
        );

        -- Construct the final code value
        code_value := Concat('ADC', new_code, p_amount);

        -- Check if the code already exists
        IF NOT EXISTS (SELECT 1 FROM redeem_code_table WHERE redeem_code_value = code_value) THEN
            -- Insert the new code into the table
            INSERT INTO redeem_code_table(
                redeem_code_value,
                redeem_code_amount,
                redeem_code_description,
                users_id,
                redeem_code_visible,
                redeem_code_rule_id
            ) VALUES (
                code_value,
                p_amount,
                'USER CODE',
                p_user_id,
                FALSE,
                p_rule_id
            ) RETURNING redeem_code_id INTO redeem_code;

            -- Return redeem_code_id on successful insertion
            RETURN redeem_code;
        END IF;

        -- Increment the attempt counter
        attempts := attempts + 1;
    END LOOP;

    -- If no unique code could be generated after max_attempts, return FALSE
    RETURN redeem_code;
EXCEPTION
    WHEN others THEN
        -- Log the error (optional) and return FALSE
        RAISE NOTICE 'Error creating redeem code: %', SQLERRM;
        RETURN redeem_code;
END;
$function$

