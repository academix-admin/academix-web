-- schema:   public
-- function: verify_code_rule(p_user_id uuid, p_redeem_id uuid, p_data jsonb)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.verify_code_rule(p_user_id uuid, p_redeem_id uuid, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "error": null, "check_data": null, "called": "2200"}'; -- Default result structure
    rank INT;
    category TEXT;
    rules_code_id UUID;
    -- CATEGORY
    top BOOLEAN := FALSE;
    mid BOOLEAN := FALSE;
    bot BOOLEAN := FALSE;
    -- RANK
    p1 BOOLEAN := FALSE;
    p2 BOOLEAN := FALSE;
    p3 BOOLEAN := FALSE;  

    category_check BOOLEAN;  
    rank_check BOOLEAN;  
    overall_check BOOLEAN;
    check_data JSONB;
BEGIN
    rank := (p_data->>'rank')::INT;
    category := p_data->>'category';

    IF (rank IS NULL AND category IS NULL) OR p_redeem_id IS NULL THEN 
      result := jsonb_set(result, '{status}', '"Rule.invalid_format"', false);
      RETURN result;
    END IF;

    -- Fetch rules
    SELECT 
      rcrt.redeem_code_rule_id,
      -- CATEGORY
      rcrt.redeem_code_rule_top,
      rcrt.redeem_code_rule_mid,
      rcrt.redeem_code_rule_bot,
      -- RANK
      rcrt.redeem_code_rule_rank1,
      rcrt.redeem_code_rule_rank2,
      rcrt.redeem_code_rule_rank3      
    INTO
      rules_code_id,
      top,
      mid,
      bot,
      p1,
      p2,
      p3  
    FROM redeemable_table rt
    LEFT JOIN redeem_code_table rct ON rt.redeem_code_id = rct.redeem_code_id
    LEFT JOIN redeem_code_rule_table rcrt ON rcrt.redeem_code_rule_id = rct.redeem_code_rule_id
    WHERE rt.redeemable_id = p_redeem_id; 

    -- If no rules found, automatically pass the check
    IF rules_code_id IS NULL THEN
        overall_check := TRUE;
        check_data := jsonb_build_object(
            'rank_check', TRUE,
            'category_check', TRUE,
            'overall_check', TRUE
        );
        result := jsonb_set(result, '{check_data}', check_data, false);
        result := jsonb_set(result, '{status}', '"Rule.passed"', false);
        RETURN result;
    END IF;     

    -- Category
    category_check := CASE 
          WHEN category = 'Position.top' THEN  
              top
          WHEN category = 'Position.mid' THEN  
              mid
          WHEN category = 'Position.bot' THEN  
              bot
          ELSE 
              (top = FALSE AND mid = FALSE AND bot = FALSE)
    END;

    -- Rank
    rank_check := CASE 
          WHEN rank = 1 THEN  
              p1
          WHEN rank = 2 THEN  
              p2
          WHEN rank = 3 THEN  
              p3
          ELSE 
              (p1 = FALSE AND p2 = FALSE AND p3 = FALSE)
    END;


    overall_check := rank_check = TRUE AND category_check = TRUE;
    check_data := jsonb_build_object(
      'rank_check', rank_check,
      'category_check', category_check,
      'overall_check', overall_check
    );

    result := jsonb_set(result, '{check_data}', check_data, false);

    IF overall_check = TRUE THEN 
        result := jsonb_set(result, '{status}', '"Rule.passed"', false);  -- Set status to passed
    ELSE 
        result := jsonb_set(result, '{status}', '"Rule.failed"', false);  -- Set status to failed
    END IF;

    -- Return the final result
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Catch unexpected errors and update the result
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM), false); -- Include the error message
        result := jsonb_set(result, '{status}', '"Rule.error"', false);  -- Set status to failed
        RETURN result;
END;
$function$

