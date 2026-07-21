-- schema:   public
-- function: change_topic_personalised_status(p_user_id uuid, p_topic_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.change_topic_personalised_status(p_user_id uuid, p_topic_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_is_personalised boolean;
BEGIN
    -- Guard: caller must be authenticated as themselves
    IF p_user_id <> auth.uid() THEN
        RETURN jsonb_build_object('status', 'PersonalisedStatus.error');
    END IF;

    -- Guard: topic must exist
    IF NOT EXISTS (
        SELECT 1 FROM topics_table WHERE topics_id = p_topic_id
    ) THEN
        RETURN jsonb_build_object('status', 'PersonalisedStatus.error');
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM personalized_table
        WHERE users_id  = p_user_id
          AND topics_id = p_topic_id
    ) INTO v_is_personalised;

    IF v_is_personalised THEN
        DELETE FROM personalized_table
        WHERE users_id  = p_user_id
          AND topics_id = p_topic_id;

        RETURN jsonb_build_object('status', 'PersonalisedStatus.removed');
    ELSE
        -- ON CONFLICT DO NOTHING handles the race condition where two
        -- requests arrive simultaneously — both return added, no duplicate
        INSERT INTO personalized_table (users_id, topics_id)
        VALUES (p_user_id, p_topic_id)
        ON CONFLICT ON CONSTRAINT personalized_table_users_id_topics_id_key
        DO NOTHING;

        RETURN jsonb_build_object('status', 'PersonalisedStatus.added');
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('status', 'PersonalisedStatus.error');
END;
$function$

