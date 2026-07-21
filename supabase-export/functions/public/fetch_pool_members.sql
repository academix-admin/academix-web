-- schema:   public
-- function: fetch_pool_members(p_user_id uuid, p_pool_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_after_pool_members jsonb, p_for_ranking boolean)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_pool_members(p_user_id uuid, p_pool_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_after_pool_members jsonb, p_for_ranking boolean DEFAULT false)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sortID TEXT;
BEGIN
    -- Extract sort ID from the passed JSONB object
    sortID := (p_after_pool_members->>'sort_id')::TEXT;

    RETURN QUERY
    
    WITH filtered_members AS (
        SELECT
            pmt.pools_members_id,
            pmt.pools_id,
            pmt.sort_created_id,
            pmt.users_id,
            pmt.pools_members_rank,
            pmt.pools_members_points,
            pmt.pools_members_price,
            pmt.pools_members_paid_amount,
            pmt.pools_completed_question_tracker_size,
            pmt.pools_completed_question_tracker_time,
            pmt.pools_members_created_at,
            ct.challenge_question_count
        FROM pools_members_table pmt
        LEFT JOIN pools_table pt ON pt.pools_id = pmt.pools_id
        LEFT JOIN challenge_table ct ON ct.challenge_id = pt.challenge_id
        WHERE pmt.pools_id = p_pool_id
        AND ((p_for_ranking = FALSE AND (sortID IS NULL OR (pmt.sort_created_id)::TEXT > sortID::TEXT))
        OR (p_for_ranking = TRUE AND (sortID IS NULL OR (pmt.pools_members_rank)::TEXT > sortID::TEXT)))
        ORDER BY 
            CASE WHEN p_for_ranking THEN pmt.pools_members_rank ELSE NULL END ASC,
            CASE WHEN NOT p_for_ranking THEN pmt.sort_created_id ELSE NULL END ASC
        LIMIT p_limit_by
    )
    SELECT
        jsonb_build_object(
            'pools_members_id', fm.pools_members_id,
            'pools_members_is_user',fm.users_id = p_user_id,
            'pools_members_rank',fm.pools_members_rank,
            'pools_members_points',fm.pools_members_points,
            'pools_members_price',fm.pools_members_price,
            'pools_members_paid_amount',fm.pools_members_paid_amount,
            'pools_completed_question_tracker_size',fm.pools_completed_question_tracker_size,
            'pools_completed_question_tracker_time',fm.pools_completed_question_tracker_time,
            'pools_members_created_at',fm.pools_members_created_at,
            'pools_id', fm.pools_id,
            'challenge_question_count', fm.challenge_question_count,
            'sort_created_id', fm.sort_created_id,
            'users_details', get_user_fields(
                fm.users_id,
                ARRAY['users_id', 'users_names', 'users_username', 'users_image', 'roles_id', 'roles_identity', 'roles_level'],
                p_locale,
                ARRAY['roles_table', 'roles_details'],
                ARRAY['roles_identity']
                )
        )
    FROM filtered_members fm
    LEFT JOIN users_table ut ON ut.users_id = fm.users_id
    LEFT JOIN roles_table rt ON rt.roles_id = ut.roles_id
    ORDER BY 
        CASE WHEN p_for_ranking THEN fm.pools_members_rank ELSE NULL END ASC,
        CASE WHEN NOT p_for_ranking THEN fm.sort_created_id ELSE NULL END ASC;
    
END;
$function$

