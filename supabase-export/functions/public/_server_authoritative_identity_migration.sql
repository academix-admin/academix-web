-- =====================================================================================
-- Remove client-supplied p_user_id from change_creator_follow_status /
-- change_topic_personalised_status, and drop anon EXECUTE. (ACADEMIX_PLAN Part I §2.5 —
-- server-authoritative identity.)
--
-- WHAT WAS ACTUALLY WRONG
-- Both functions were SECURITY DEFINER, EXECUTE-able by `anon`, and took the acting user as a
-- PARAMETER. They were not exploitable: each guarded with
--     IF p_user_id IS DISTINCT FROM auth.uid() THEN <reject>
-- and IS DISTINCT FROM (rather than <>) is deliberately chosen so an anon caller — whose auth.uid()
-- is NULL — is rejected instead of the comparison evaluating to NULL and falling through.
--
-- So this is hardening, not an incident. But the shape was wrong in two ways worth removing:
--   1. `anon` had EXECUTE on functions that can only ever succeed for an authenticated user. Least
--      privilege says do not grant what can never be legitimately used.
--   2. Taking the identity as a parameter makes every caller's correctness depend on a guard being
--      present and right. The guard was right HERE, but the pattern invites a future function that
--      forgets it. Identity should be underivable from client input, not merely checked against it.
--
-- The parameter is now gone entirely: identity comes from auth.uid() and cannot be expressed by a
-- caller at all. Nothing to spoof, nothing to guard.
--
-- BLAST RADIUS (verified before writing this)
--   * academix-app: never calls either function.
--   * academix-web: exactly one file, quiz-details-viewer.tsx, two call sites — updated alongside.
-- The old 2-arg versions are dropped, so a web bundle deployed BEFORE this migration will get
-- "function does not exist" on the follow / personalise buttons until it is rebuilt. That is why
-- this ships together with the client change.
-- =====================================================================================

-- ── Follow / unfollow a creator ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.change_creator_follow_status(p_creator_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_user_id      uuid := auth.uid();
    v_is_following boolean;
BEGIN
    -- Unauthenticated callers have no identity to act as. (anon no longer holds EXECUTE either;
    -- this is the second layer, not the only one.)
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('status', 'FollowStatus.error', 'error', 'Unauthorized');
    END IF;

    IF v_user_id = p_creator_id THEN
        RETURN jsonb_build_object('status', 'FollowStatus.self_blocked');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM users_table WHERE users_id = p_creator_id) THEN
        RETURN jsonb_build_object('status', 'FollowStatus.error', 'error', 'Creator does not exists');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM users_followers_table
        WHERE users_id = v_user_id AND users_creator_id = p_creator_id
    ) INTO v_is_following;

    IF v_is_following THEN
        DELETE FROM users_followers_table
        WHERE users_id = v_user_id AND users_creator_id = p_creator_id;
        RETURN jsonb_build_object('status', 'FollowStatus.unfollowed');
    ELSE
        -- ON CONFLICT DO NOTHING: two simultaneous taps must not error, just settle as followed.
        INSERT INTO users_followers_table (users_id, users_creator_id)
        VALUES (v_user_id, p_creator_id)
        ON CONFLICT DO NOTHING;
        RETURN jsonb_build_object('status', 'FollowStatus.followed');
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'FollowStatus.error', 'error', SQLERRM);
END;
$function$;

REVOKE ALL ON FUNCTION public.change_creator_follow_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_creator_follow_status(uuid) TO authenticated;

-- ── Personalise / un-personalise a topic ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.change_topic_personalised_status(p_topic_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_user_id         uuid := auth.uid();
    v_is_personalised boolean;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('status', 'PersonalisedStatus.error');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM topics_table WHERE topics_id = p_topic_id) THEN
        RETURN jsonb_build_object('status', 'PersonalisedStatus.error');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM personalized_table
        WHERE users_id = v_user_id AND topics_id = p_topic_id
    ) INTO v_is_personalised;

    IF v_is_personalised THEN
        DELETE FROM personalized_table
        WHERE users_id = v_user_id AND topics_id = p_topic_id;
        RETURN jsonb_build_object('status', 'PersonalisedStatus.removed');
    ELSE
        INSERT INTO personalized_table (users_id, topics_id)
        VALUES (v_user_id, p_topic_id)
        ON CONFLICT DO NOTHING;
        RETURN jsonb_build_object('status', 'PersonalisedStatus.added');
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'PersonalisedStatus.error');
END;
$function$;

REVOKE ALL ON FUNCTION public.change_topic_personalised_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_topic_personalised_status(uuid) TO authenticated;

-- ── Remove the old identity-as-parameter versions ───────────────────────────────────────────────
-- Dropped rather than left in place: leaving them would keep the spoofable-looking surface alive
-- and let a caller keep passing an identity, which is the whole thing being removed.
DROP FUNCTION IF EXISTS public.change_creator_follow_status(uuid, uuid);
DROP FUNCTION IF EXISTS public.change_topic_personalised_status(uuid, uuid);
