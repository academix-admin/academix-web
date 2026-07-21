-- schema:   public
-- function: get_user_achievements_progress(p_user_id uuid, p_achievements_id uuid, p_achievements_req jsonb)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_user_achievements_progress(p_user_id uuid, p_achievements_id uuid, p_achievements_req jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result jsonb;
BEGIN
    SELECT
        jsonb_build_object(
            'achievements_progress_id', apt.achievements_progress_id,
            'achievements_progress_rewarded', apt.achievements_progress_rewarded,
            'achievements_progress_completed', apt.achievements_progress_completed,
            'achievements_progress_created_at', apt.achievements_progress_created_at,
            'achievements_progress_updated_at', apt.achievements_progress_updated_at,
            'achievements_progress_count', COALESCE((apt.achievements_progress_value->>'count')::INT, 0),
            'achievements_progress_required', COALESCE((p_achievements_req->>'count')::INT, 0),
            'redeem_code_details',jsonb_build_object(
              'redeem_code_id',rct.redeem_code_id,
              'redeem_code_value',rct.redeem_code_value,
              'redeem_code_expires',rct.redeem_code_expires
            )
        )
    INTO result
    FROM achievements_progress_table apt
    LEFT JOIN redeem_code_table rct ON rct.redeem_code_id = apt.redeem_code_id
    WHERE apt.users_id = p_user_id 
      AND COALESCE((p_achievements_req->>'count')::INT, 0) > 0 
      AND apt.achievements_id = p_achievements_id
    LIMIT 1;
    
    RETURN COALESCE(result, jsonb_build_object(
            'achievements_progress_rewarded', FALSE,
            'achievements_progress_completed', FALSE,
            'achievements_progress_count', 0,
            'achievements_progress_required', COALESCE((p_achievements_req->>'count')::INT, 0),
            'redeem_code_details',jsonb_build_object(
              'redeem_code_id',null,
              'redeem_code_value',null,
              'redeem_code_expires',null
            )
        ));
END;
$function$

