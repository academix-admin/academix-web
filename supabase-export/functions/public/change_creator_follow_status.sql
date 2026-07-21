-- schema:   public
-- function: change_creator_follow_status(p_user_id uuid, p_creator_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.change_creator_follow_status(p_user_id uuid, p_creator_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_is_following boolean;
BEGIN
    -- Guard: can't follow yourself
    IF p_user_id = p_creator_id THEN
        RETURN jsonb_build_object('status', 'FollowStatus.self_blocked');
    END IF;

    -- Guard: creator must exist
    IF NOT EXISTS (
        SELECT 1 FROM users_table WHERE users_id = p_creator_id
    ) THEN
        RETURN jsonb_build_object('status', 'FollowStatus.error', 'error', 'Creator does not exists');
    END IF;

    -- Check current follow state
    SELECT EXISTS (
        SELECT 1
        FROM users_followers_table
        WHERE users_id         = p_user_id
          AND users_creator_id = p_creator_id
    ) INTO v_is_following;

    IF v_is_following THEN
        -- Already following — unfollow
        DELETE FROM users_followers_table
        WHERE users_id         = p_user_id
          AND users_creator_id = p_creator_id;

        RETURN jsonb_build_object('status', 'FollowStatus.unfollowed');
    ELSE
        -- Not following — follow (or already following edge case: ON CONFLICT = no-op → still return followed)
        INSERT INTO users_followers_table (users_id, users_creator_id)
        VALUES (p_user_id, p_creator_id)
        ON CONFLICT DO NOTHING;

        RETURN jsonb_build_object('status', 'FollowStatus.followed');
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('status', 'FollowStatus.error', 'error', SQLERRM);
END;
$function$

