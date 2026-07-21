-- schema:   public
-- function: fetch_friends(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_after_friends jsonb, p_search_key text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_friends(p_user_id uuid, p_country text, p_locale text, p_gender text, p_age text, p_limit_by integer, p_after_friends jsonb, p_search_key text DEFAULT NULL::text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sortID    TEXT;
    direction TEXT;
BEGIN
    -- Extract cursor fields from the pagination JSONB object
    -- sortID: the last sort_created_id from the previous page (NULL on first page)
    -- direction: 'oldest' = descending order, 'latest' = ascending order
    sortID    := (p_after_friends->>'sort_id')::TEXT;
    direction := (p_after_friends->>'direction')::TEXT;

    RETURN QUERY
    WITH filtered_friends AS (
        SELECT
            ut.users_id,
            ut.users_names,
            ut.users_username,
            ut.users_image,
            ut.users_referred_status,
            ut.users_created_at,
            ut.sort_created_id
        FROM users_table mt
        RIGHT JOIN users_table ut ON ut.users_id = mt.users_id
        WHERE
            -- Only return friends referred by this user
            mt.users_referred_id = p_user_id

            -- Cursor pagination:
            -- NULL sortID means first page, no cursor filter needed
            -- 'oldest' (DESC): get rows BEFORE the last seen sort_created_id
            -- 'latest' (ASC) : get rows AFTER  the last seen sort_created_id
            AND (
                sortID IS NULL
                OR (direction = 'oldest' AND ut.sort_created_id < sortID)
                OR (direction = 'latest' AND ut.sort_created_id > sortID)
            )

            -- Search filter: only applied when p_search_key is provided
            -- Matches against display name or username, case-insensitive
            AND (
                p_search_key IS NULL
                OR ut.users_names    ILIKE '%' || p_search_key || '%'
                OR ut.users_username ILIKE '%' || p_search_key || '%'
            )

        -- Explicit branching avoids the dual-CASE NULL sort ambiguity:
        -- 'latest' pages forward in ASC order
        -- 'oldest' / NULL (default) pages forward in DESC order
        ORDER BY
            CASE
                WHEN direction = 'latest' THEN ut.sort_created_id
                ELSE NULL
            END ASC NULLS LAST,
            CASE
                WHEN direction = 'oldest' OR direction IS NULL THEN ut.sort_created_id
                ELSE NULL
            END DESC NULLS LAST

        LIMIT p_limit_by
    )
    SELECT jsonb_build_object(
        'users_id',              users_id,
        'users_names',           users_names,
        'users_username',        users_username,
        'users_image',           users_image,
        'users_referred_status', users_referred_status,
        'users_created_at',      users_created_at,
        -- Client uses this as the next cursor value
        'sort_created_id',       sort_created_id
    )
    FROM filtered_friends;
END;
$function$

