-- schema:   public
-- function: get_creator_categories(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid, p_limit_by integer, p_after_categories jsonb)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_creator_categories(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid, p_limit_by integer, p_after_categories jsonb)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sortID TEXT;
BEGIN
    -- Extract sort ID from the passed JSONB object
    sortID := (p_after_categories->>'sort_id')::TEXT;
    -- Main query to fetch categories
    RETURN QUERY
    SELECT *
    FROM get_categories(p_user_id, p_country, p_locale, p_gender, p_age) AS data
    WHERE 
    (data->'creator_details'->>'users_id')::UUID <> p_user_id 
    AND (sortID IS NULL 
    OR (data->>'sort_updated_id')::TEXT < sortID::TEXT)
    ORDER BY (data->>'sort_updated_id')::TEXT DESC
    LIMIT p_limit_by;
    
END;
$function$

