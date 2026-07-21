-- schema:   public
-- function: evaluate_category(p_user_id uuid, p_category_id uuid, p_approval_checker text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.evaluate_category(p_user_id uuid, p_category_id uuid, p_approval_checker text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    time TEXT;
    sort TEXT;
    locale TEXT;
BEGIN

    -- If no approval is found, return status
    IF p_approval_checker NOT IN ('Approval.open', 'Approval.reserved', 'Approval.rejected', 'Approval.approved') THEN
        RETURN jsonb_build_object(
            'status', NULL,
            'code', 'approval_failure'
        );
    END IF;

    SELECT LOWER(lt.language_code) INTO locale FROM users_table ut 
    LEFT JOIN language_table lt ON lt.language_id = ut.language_id 
    WHERE ut.users_id = p_user_id;

    IF locale IS NULL THEN 
       RETURN jsonb_build_object(
            'status', NULL,
            'code', 'approval_error'
        );
    END IF;

    -- Update the topic_category_table with the approval
    time := NOW()::TEXT;
    sort := tsid(time::timestamp);
    UPDATE topic_category_table
    SET 
        approval_status = approval_status || jsonb_build_object(locale, p_approval_checker),
        topic_category_reviewed_by = COALESCE(topic_category_reviewed_by, '{}'::JSONB) || jsonb_build_object(locale, p_user_id),
        topic_category_updated_at = time,
        sort_updated_id = sort
    WHERE topic_category_id = p_category_id;

    -- Check if the update affected any rows
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'status', NULL,
            'code', 'approval_failure'
        );
    END IF;

    -- If everything succeeds, return success
    RETURN jsonb_build_object(
        'status', p_approval_checker,
        'time', time,
        'sort', sort,
        'code', 'approval_updated'
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Catch unexpected errors
        RETURN jsonb_build_object(
            'status', NULL,
            'code', 'approval_error',
            'message', SQLERRM
        );
END;
$function$

