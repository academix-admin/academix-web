-- schema:   public
-- function: fetch_general_content_check(p_owner_id uuid, p_viewer_id uuid, p_search text, p_checker_id uuid, p_locale boolean, p_country boolean, p_gender boolean, p_age boolean, p_visible boolean, p_approval text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_general_content_check(p_owner_id uuid, p_viewer_id uuid, p_search text, p_checker_id uuid DEFAULT NULL::uuid, p_locale boolean DEFAULT NULL::boolean, p_country boolean DEFAULT NULL::boolean, p_gender boolean DEFAULT NULL::boolean, p_age boolean DEFAULT NULL::boolean, p_visible boolean DEFAULT false, p_approval text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE 
    override_access BOOLEAN;
    permission_access BOOLEAN;
BEGIN
    -- Immediate access check if viewer is owner or matches the checker ID
    IF p_owner_id = p_viewer_id OR p_viewer_id = p_checker_id THEN 
        RETURN TRUE;
    END IF;

    -- Check permission access
    SELECT permission_checker(p_owner_id, p_viewer_id)
    INTO permission_access;

    IF permission_access = TRUE THEN
        RETURN TRUE;
    END IF;

    -- Final permission evaluation
    RETURN p_search IS NOT NULL
        AND p_approval = 'Approval.approved'
        AND permission_access = TRUE
        AND COALESCE(p_visible, FALSE) 
        AND COALESCE(p_locale, FALSE) 
        AND COALESCE(p_country, FALSE) 
        AND COALESCE(p_gender, FALSE) 
        AND COALESCE(p_age, FALSE);
END;
$function$

