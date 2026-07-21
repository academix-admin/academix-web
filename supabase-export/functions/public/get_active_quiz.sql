-- schema:   public
-- function: get_active_quiz(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_active_quiz(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'topics_id',             tt.topics_id,
        'topics_image',          tt.topics_image,
        'topics_created_at',     tt.topics_created_at,
        'topics_updated_at',     tt.topics_updated_at,
        'sort_created_id',       tt.sort_created_id,
        'sort_updated_id',       tt.sort_updated_id,
        'topics_identity',       cr.translated_identity,
        'pools_details',         get_pool_details(p_user_id, tt.topics_id, p_locale, p_country, p_gender, p_age),
        'creator_details',       get_user_fields(
            cr.creator_id,
            ARRAY['users_id', 'users_names', 'users_username', 'users_image']
        ),
        'creator_is_followed',   EXISTS (
            SELECT 1
            FROM users_followers_table
            WHERE users_id         = p_user_id
              AND users_creator_id = cr.creator_id
        ),
        'topic_is_personalised', EXISTS (
            SELECT 1
            FROM personalized_table
            WHERE users_id  = p_user_id
              AND topics_id = tt.topics_id
        )
    )
    INTO result
    FROM pools_members_table pm
    JOIN pools_table  pt ON pt.pools_id  = pm.pools_id
    JOIN topics_table tt ON tt.topics_id = pt.topics_id

    CROSS JOIN LATERAL (
        SELECT
            translation::uuid AS creator_id,
            (SELECT translation FROM translate(tt.topics_identity, p_locale)) AS translated_identity
        FROM translate(tt.topics_created_by, p_locale)
    ) cr

    WHERE
        pm.users_id         = p_user_id
        AND pt.pools_locale = p_locale
        AND pt.pools_status IN ('Pools.active', 'Pools.open', 'Pools.sealed')
        AND pt.pools_job IS NOT NULL
        AND pt.pools_job NOT IN ('PoolJob.cancelled', 'PoolJob.pool_ended')
    LIMIT 1;

    RETURN result;
END;
$function$

