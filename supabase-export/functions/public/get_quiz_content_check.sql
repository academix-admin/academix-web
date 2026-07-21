-- schema:   public
-- function: get_quiz_content_check(p_owner_id uuid, p_viewer_id uuid, p_search text, p_locale boolean, p_country boolean, p_gender boolean, p_age boolean, p_visible boolean, p_approval text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_quiz_content_check(p_owner_id uuid, p_viewer_id uuid, p_search text, p_locale boolean DEFAULT NULL::boolean, p_country boolean DEFAULT NULL::boolean, p_gender boolean DEFAULT NULL::boolean, p_age boolean DEFAULT NULL::boolean, p_visible boolean DEFAULT false, p_approval text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE 
    permission_access BOOLEAN;
BEGIN


    -- Final permission evaluation
    RETURN p_approval = 'Approval.approved'
        AND p_search IS NOT NULL
        AND COALESCE(p_visible, FALSE) 
        AND COALESCE(p_locale, FALSE) 
        AND COALESCE(p_country, FALSE) 
        AND COALESCE(p_gender, FALSE) 
        AND COALESCE(p_age, FALSE);
END;
$function$

