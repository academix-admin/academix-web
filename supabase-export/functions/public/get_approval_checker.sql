-- schema:   public
-- function: get_approval_checker(viewer_id uuid, looking_tab text, record_approval text, reviewer_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_approval_checker(viewer_id uuid, looking_tab text, record_approval text, reviewer_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN

    IF looking_tab IS NULL THEN 
        RETURN FALSE;
    END IF;

    IF looking_tab = record_approval THEN
        IF record_approval != 'Approval.open' THEN
            RETURN reviewer_id = viewer_id;
        END IF;
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$function$

