-- schema:   public
-- function: get_users_redeem_code(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_limit_by integer, p_after_codes jsonb)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_users_redeem_code(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_limit_by integer, p_after_codes jsonb)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  sortID TEXT;
  direction TEXT;
BEGIN

  sortID := (p_after_codes->>'sort_id')::TEXT;
  direction := (p_after_codes->>'direction')::TEXT;

    RETURN QUERY 
    SELECT 
        jsonb_build_object(
            'redeem_code_amount', rct.redeem_code_amount, -- Amount associated with the code
            'redeem_code_id', rct.redeem_code_id,          -- Unique ID of the redeem code
            'redeem_code_value', rct.redeem_code_value,
            'redeem_rule_top', COALESCE(rcrt.redeem_code_rule_top, FALSE),
            'redeem_rule_mid', COALESCE(rcrt.redeem_code_rule_mid, FALSE),
            'redeem_rule_bot', COALESCE(rcrt.redeem_code_rule_bot, FALSE),
            'redeem_rule_rank1', COALESCE(rcrt.redeem_code_rule_rank1, FALSE),
            'redeem_rule_rank2', COALESCE(rcrt.redeem_code_rule_rank2, FALSE),
            'redeem_rule_rank3', COALESCE(rcrt.redeem_code_rule_rank3, FALSE),
            'redeem_code_expires', rct.redeem_code_expires,
            'sort_created_id', rct.sort_created_id
        )
    FROM redeem_code_table rct
    LEFT JOIN redeem_code_rule_table rcrt ON rcrt.redeem_code_rule_id = rct.redeem_code_rule_id
    WHERE (rct.users_id IS NULL OR rct.users_id = p_user_id) -- Code is either for all users or specific to the user
      AND rct.redeem_code_active = TRUE                   -- Code is active
      AND NOT EXISTS (
          SELECT 1 
          FROM redeemable_table rt 
          WHERE rt.redeem_code_id = rct.redeem_code_id 
            AND rt.users_id = p_user_id
      )
      AND (rct.redeem_code_expires IS NULL OR rct.redeem_code_expires > NOW())
      AND (
        sortID IS NULL OR (
          (direction = 'oldest' AND (rct.sort_created_id)::TEXT < sortID)
          OR (direction = 'latest' AND (rct.sort_created_id)::TEXT > sortID)
        )
      )
    ORDER BY
      CASE
        WHEN direction = 'oldest' OR direction IS NULL THEN rct.sort_created_id
      END DESC,
      CASE
        WHEN direction = 'latest' THEN rct.sort_created_id
      END ASC
    LIMIT p_limit_by;
END;
$function$

