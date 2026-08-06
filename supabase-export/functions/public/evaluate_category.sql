-- schema:   public
-- function: evaluate_category(p_category_id uuid, p_approval_checker text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.evaluate_category(p_category_id uuid, p_approval_checker text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    time TEXT;
    sort TEXT;
    locale TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('status', NULL, 'code', 'approval_error');
    END IF;

    -- Server-authoritative role gate: only a reviewer+ role may evaluate content.
    PERFORM public.assert_can_review(v_user_id);

    IF p_approval_checker NOT IN ('Approval.open', 'Approval.reserved', 'Approval.rejected', 'Approval.approved') THEN
        RETURN jsonb_build_object('status', NULL, 'code', 'approval_failure');
    END IF;

    SELECT LOWER(lt.language_code) INTO locale FROM users_table ut
    LEFT JOIN language_table lt ON lt.language_id = ut.language_id
    WHERE ut.users_id = v_user_id;

    IF locale IS NULL THEN
       RETURN jsonb_build_object('status', NULL, 'code', 'approval_error');
    END IF;

    -- Guard: a reviewer can only approve/reject content that actually has a submission in their
    -- OWN locale — never blindly write an approval_status entry for a locale the content was never
    -- submitted in (that would create a phantom approval with no backing translation).
    IF NOT EXISTS (
        SELECT 1 FROM topic_category_table
        WHERE topic_category_id = p_category_id
          AND topic_category_identity ? locale
    ) THEN
        RETURN jsonb_build_object('status', NULL, 'code', 'approval_failure');
    END IF;

    time := NOW()::TEXT;
    sort := tsid(time::timestamp);
    UPDATE topic_category_table
    SET
        approval_status = approval_status || jsonb_build_object(locale, p_approval_checker),
        topic_category_reviewed_by = COALESCE(topic_category_reviewed_by, '{}'::JSONB) || jsonb_build_object(locale, v_user_id),
        topic_category_updated_at = time,
        sort_updated_id = sort
    WHERE topic_category_id = p_category_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', NULL, 'code', 'approval_failure');
    END IF;

    RETURN jsonb_build_object('status', p_approval_checker, 'time', time, 'sort', sort, 'code', 'approval_updated');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('status', NULL, 'code', 'approval_error', 'message', SQLERRM);
END;
$function$;
