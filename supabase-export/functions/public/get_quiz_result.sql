-- schema:   public
-- function: get_quiz_result(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_pool_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_quiz_result(p_user_id uuid, p_locale text, p_country text, p_gender text, p_age text, p_pool_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"status": null, "members": [], "error": null, "called": "5500"}';
    quiz JSONB;
    question_total_count INT;
    members JSONB[];
BEGIN
    -- Get pool status and job
    SELECT ct.challenge_question_count INTO question_total_count
    FROM pools_table pt 
    LEFT JOIN challenge_table ct ON ct.challenge_id = pt.challenge_id
    WHERE pt.pools_id = p_pool_id AND pt.pools_completed_at IS NOT NULL;

    -- Check if count exist
    IF question_total_count IS NULL THEN
        result := jsonb_set(result, '{status}', '"Pool.not_available"');
        RETURN result;
    END IF;

    -- Get user's quiz data
    WITH user_data AS (
        SELECT 
            fm.pools_members_id,
            fm.users_id,
            fm.pools_members_rank,
            fm.pools_members_points,
            fm.pools_members_price,
            fm.pools_members_paid_amount,
            fm.pools_completed_question_tracker_size,
            fm.pools_completed_question_tracker_time,
            fm.pools_members_created_at,
            fm.pools_id,
            fm.sort_created_id,
            get_user_fields(
                fm.users_id,
                ARRAY['users_id', 'users_names', 'users_username', 'users_image', 'roles_id', 'roles_identity', 'roles_level'],
                p_locale,
                ARRAY['roles_table', 'roles_details'],
                ARRAY['roles_identity']
            ) as user_details
        FROM pools_members_table fm
        WHERE fm.users_id = p_user_id AND fm.pools_id = p_pool_id
    )
    SELECT
        jsonb_build_object(
            'pools_members_id', ud.pools_members_id,
            'pools_members_is_user', ud.users_id = p_user_id,
            'pools_members_rank', ud.pools_members_rank,
            'pools_members_points', ud.pools_members_points,
            'pools_members_price', ud.pools_members_price,
            'pools_members_paid_amount', ud.pools_members_paid_amount,
            'pools_completed_question_tracker_size', ud.pools_completed_question_tracker_size,
            'pools_completed_question_tracker_time', ud.pools_completed_question_tracker_time,
            'pools_members_created_at', ud.pools_members_created_at,
            'pools_id', ud.pools_id,
            'challenge_question_count', question_total_count,
            'sort_created_id', ud.sort_created_id,
            'users_details', ud.user_details
        ) INTO quiz
    FROM user_data ud;

    -- Get pool members
    SELECT array_agg(member) INTO members
    FROM fetch_pool_members(
        p_user_id,  
        p_pool_id,
        p_country, 
        p_locale,
        p_gender,
        p_age, 
        p_limit_by => 10,
        p_after_pool_members => NULL,
        p_for_ranking => TRUE
    ) AS member;

    -- Build the result
    IF quiz IS NOT NULL THEN
        result := jsonb_set(result, '{quiz}', quiz);
    END IF;
    
    IF members IS NOT NULL THEN
        result := jsonb_set(result, '{members}', to_jsonb(members));
    END IF;
    
    result := jsonb_set(result, '{status}', '"Pool.success"');

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Handle unexpected errors
        result := jsonb_set(result, '{status}', '"Pool.error"');
        result := jsonb_set(result, '{error}', to_jsonb('Error: ' || SQLERRM));
        RETURN result;
END;
$function$

