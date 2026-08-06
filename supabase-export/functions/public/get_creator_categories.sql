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
    IF NOT (coalesce(auth.jwt()->>'role','')='service_role' OR session_user IN ('service_role','postgres')) THEN
        p_user_id := auth.uid();
    END IF;
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'not_authorized: unauthenticated' USING errcode='42501';
    END IF;
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
$function$;

REVOKE EXECUTE ON FUNCTION public.get_creator_categories(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid, p_limit_by integer, p_after_categories jsonb) FROM PUBLIC, anon;
