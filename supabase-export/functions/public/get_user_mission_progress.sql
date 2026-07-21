-- schema:   public
-- function: get_user_mission_progress(p_user_id uuid, p_mission_id uuid, p_mission_req jsonb)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_user_mission_progress(p_user_id uuid, p_mission_id uuid, p_mission_req jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result jsonb;
BEGIN
    SELECT
        jsonb_build_object(
            'mission_progress_id', mpt.mission_progress_id,
            'mission_progress_rewarded', mpt.mission_progress_rewarded,
            'mission_progress_completed', mpt.mission_progress_completed,
            'mission_progress_created_at', mpt.mission_progress_created_at,
            'mission_progress_updated_at', mpt.mission_progress_updated_at,
            'mission_progress_count', COALESCE((mpt.mission_progress_value->>'count')::INT, 0),
            'mission_progress_required', COALESCE((p_mission_req->>'count')::INT, 0),
            'redeem_code_details',jsonb_build_object(
              'redeem_code_id',rct.redeem_code_id,
              'redeem_code_value',rct.redeem_code_value,
              'redeem_code_expires',rct.redeem_code_expires
            )
        )
    INTO result
    FROM mission_progress_table mpt
    LEFT JOIN redeem_code_table rct ON rct.redeem_code_id = mpt.redeem_code_id
    WHERE mpt.users_id = p_user_id 
      AND COALESCE((p_mission_req->>'count')::INT, 0) > 0 
      AND mpt.mission_id = p_mission_id
    LIMIT 1;
    
    RETURN COALESCE(result, jsonb_build_object(
            'mission_progress_rewarded', FALSE,
            'mission_progress_completed', FALSE,
            'mission_progress_count', 0,
            'mission_progress_required', COALESCE((p_mission_req->>'count')::INT, 0),
            'redeem_code_details',jsonb_build_object(
              'redeem_code_id',null,
              'redeem_code_value',null,
              'redeem_code_expires',null
            )
        ));
END;
$function$

