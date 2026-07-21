-- schema:   public
-- function: fetch_top_up_profiles(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid, p_method_id uuid, p_limit_by integer, p_after_profiles jsonb)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_top_up_profiles(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid, p_method_id uuid, p_limit_by integer, p_after_profiles jsonb)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sortID TEXT;
BEGIN
    -- Extract sort ID from the passed JSONB object
    sortID := (p_after_profiles->>'sort_id')::TEXT;

    RETURN QUERY 
    SELECT jsonb_build_object(
      'payment_profile_id', ppt.payment_profile_id,
      'payment_method_id', ppt.payment_method_id,
      'payment_details', to_jsonb(pdt)  - 'payment_details_id',
      'users_id', ppt.users_id,
      'sort_created_id', ppt.sort_created_id
    )
    FROM payment_profile_table ppt 
    LEFT JOIN payment_details_table pdt ON pdt.payment_details_id = ppt.payment_details_id
    WHERE ppt.payment_profile_buy_active = TRUE
    AND ppt.payment_profile_receiver = FALSE
    AND ppt.users_id = p_user_id
    AND ppt.payment_method_id = p_method_id
    AND (sortID IS NULL 
    OR (ppt.sort_created_id)::TEXT > sortID::TEXT)
    ORDER BY (ppt.sort_created_id)::TEXT ASC
    LIMIT p_limit_by;
END;
$function$

