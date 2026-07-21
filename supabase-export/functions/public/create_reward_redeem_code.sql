-- schema:   public
-- function: create_reward_redeem_code(p_user_id uuid, p_amount numeric, p_title text, expires_at timestamp with time zone, p_source text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.create_reward_redeem_code(p_user_id uuid, p_amount numeric, p_title text, expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_source text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    code_value TEXT;
    redeem_code JSONB;
    ts BIGINT;
    rand BIGINT;
    combined BIGINT;
    base INT := 62;
    chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    result TEXT := '';
    remainder INT;
    attempts INT := 0;
    max_attempts INT := 10;
BEGIN
    WHILE attempts < max_attempts LOOP
        -- Generate timestamp in milliseconds
        ts := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
        
        -- Add a small random part (0-999)
        rand := floor(random() * 1000)::BIGINT;
        
        -- Combine timestamp and random part (multiply to shift)
        combined := ts * 1000 + rand;

        -- Base62 encode
        result := '';
        WHILE combined > 0 LOOP
            remainder := (combined % base)::INT;
            result := substr(chars, remainder + 1, 1) || result;
            combined := combined / base;
        END LOOP;

        -- Force length at least 9 characters (pad with '0')
        result := lpad(result, 9, '0');

        -- Final code: title prefix (first few letters) + dash + code
        code_value := UPPER(left(p_title, 7)) || '-' || result;

        -- Check if already exists
        IF NOT EXISTS (SELECT 1 FROM redeem_code_table WHERE redeem_code_value = code_value) THEN
            -- Insert new code
            INSERT INTO redeem_code_table(
                redeem_code_value,
                redeem_code_amount,
                redeem_code_description,
                users_id,
                redeem_code_visible,
                redeem_code_expires,
                redeem_code_source        
            ) VALUES (
                code_value,
                p_amount,
                p_title,
                p_user_id,
                FALSE,
                expires_at,
                p_source                  
            ) RETURNING jsonb_build_object(
                'redeem_code_id', redeem_code_id,
                'redeem_code_expires', redeem_code_expires,
                'redeem_code_value', redeem_code_value
            ) INTO redeem_code;

            RETURN redeem_code;
        END IF;

        -- Try again
        attempts := attempts + 1;
    END LOOP;

    RAISE EXCEPTION 'Failed to generate unique redeem code after % attempts', max_attempts;
END;
$function$

