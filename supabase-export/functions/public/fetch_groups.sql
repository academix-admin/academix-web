-- schema:   public
-- function: fetch_groups(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid, p_type text, p_limit_by integer, p_after_groups jsonb, p_reviewer_tab text, p_limit_category integer)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_groups(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid, p_type text, p_limit_by integer, p_after_groups jsonb, p_reviewer_tab text DEFAULT NULL::text, p_limit_category integer DEFAULT NULL::integer)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    sortID TEXT;
BEGIN
    sortID := (p_after_groups->>'sort_id')::TEXT;

    RETURN QUERY
    WITH base_groups AS (
        SELECT
            cgt.category_group_id,
            cgt.category_group_identity,
            cgt.category_group_created_at,
            cgt.category_group_updated_at,
            cgt.sort_created_id,
            cgt.sort_updated_id,
            cgt.age_control,
            cgt.country_control,
            cgt.language_control,
            cgt.gender_control,
            cgt.category_group_visible,
            cgt.approval_status,
            (SELECT translation::uuid FROM translate(cgt.category_group_created_by, p_locale)) AS users_creator_id,
            (SELECT translation::uuid FROM translate(cgt.category_group_reviewed_by, p_locale)) AS users_reviewer_id
        FROM category_group_table cgt
        WHERE 
            (
                SELECT * FROM fetch_general_content_check(
                    (SELECT translation::uuid FROM translate(cgt.category_group_created_by, p_locale)),
                    p_user_id,
                    (SELECT translation FROM translate(cgt.category_group_identity, p_locale)),
                    (SELECT translation::uuid FROM translate(cgt.category_group_reviewed_by, p_locale)),
                    (SELECT value FROM decontrol(cgt.language_control, p_locale, p_locale)),
                    (SELECT value FROM decontrol(cgt.country_control, p_country, p_locale)),
                    (SELECT value FROM decontrol(cgt.gender_control, p_gender, p_locale)),
                    (SELECT value FROM decontrol(cgt.age_control, p_age, p_locale)),
                    cgt.category_group_visible,
                    (SELECT translation FROM translate(cgt.approval_status, p_locale))
                )
            ) = true
            AND (
                p_type <> 'reviewer'
                OR (p_type = 'reviewer'
                    AND p_reviewer_tab IS NOT NULL
                    AND get_approval_checker(
                        p_user_id,
                        p_reviewer_tab,
                        (SELECT translation FROM translate(cgt.approval_status, p_locale)),
                        (SELECT translation::uuid FROM translate(cgt.category_group_reviewed_by, p_locale))
                    ) = true)
            )
            AND (
                p_type <> 'creator'
                OR (p_type = 'creator' AND p_limit_category IS NULL AND (sortID IS NULL OR cgt.sort_created_id::text > sortID))
                OR (p_type = 'creator' AND p_limit_category IS NOT NULL AND (sortID IS NULL OR cgt.sort_updated_id::text < sortID))
            )
            AND (
                p_type <> 'addition'
                OR (p_type = 'addition' 
                    AND p_limit_category IS NULL 
                    AND (sortID IS NULL OR (SELECT LOWER(translation) FROM translate(cgt.category_group_identity, p_locale)) > LOWER(sortID))
                )
            )
            AND (
                p_type <> 'reviewer'
                OR (p_type = 'reviewer' AND (sortID IS NULL OR cgt.sort_updated_id::text < sortID))
            )
        ORDER BY 
            CASE WHEN p_type = 'reviewer' THEN cgt.sort_updated_id::text END DESC,
            CASE WHEN p_type = 'creator' AND p_limit_category IS NULL THEN cgt.sort_created_id::text END ASC,
            CASE WHEN p_type = 'addition' AND p_limit_category IS NULL THEN (SELECT LOWER(translation) FROM translate(cgt.category_group_identity, p_locale)) END ASC,
            CASE WHEN p_type = 'creator' AND p_limit_category IS NOT NULL THEN cgt.sort_updated_id::text END DESC
    ),
    groups_with_categories AS (
        SELECT bg.*, cat.group_categories
        FROM base_groups bg
        LEFT JOIN LATERAL (
            SELECT 
                CASE 
                    WHEN p_limit_category IS NOT NULL AND p_limit_category > 0 THEN (
                        SELECT jsonb_agg(item)
                        FROM fetch_categories(
                            p_country, 
                            p_locale, 
                            p_gender, 
                            p_age, 
                            p_user_id,
                            p_type,
                            p_limit_category, 
                            '{}'::JSONB,
                            p_reviewer_tab,
                            bg.category_group_id
                        ) AS item
                    )
                    ELSE '[]'::jsonb
                END AS group_categories
        ) cat ON true
        WHERE 
            (p_limit_category IS NULL OR p_limit_category <= 0 OR jsonb_array_length(cat.group_categories) > 0)
    )
    SELECT
        jsonb_build_object(
            'category_group_id', bg.category_group_id,
            'category_group_identity', (SELECT translation FROM translate(bg.category_group_identity, p_locale)),
            'category_group_created_at', bg.category_group_created_at,
            'category_group_updated_at', bg.category_group_updated_at,
            'sort_created_id', bg.sort_created_id,
            'sort_updated_id', bg.sort_updated_id,
            'approval', (SELECT translation FROM translate(bg.approval_status, p_locale)),
            'reviewer_id', bg.users_reviewer_id,
            'group_category', bg.group_categories,
            'creator_details', get_user_fields(
                bg.users_creator_id,
                ARRAY['users_id', 'users_names', 'users_username', 'users_image']
            ),
            'age_control', (SELECT jsonb_agg(control) FROM build_control(bg.age_control, p_locale) AS control),
            'country_control', (SELECT jsonb_agg(control) FROM build_control(bg.country_control, p_locale) AS control),
            'language_control', (SELECT jsonb_agg(control) FROM build_control(bg.language_control, p_locale) AS control),
            'gender_control', (SELECT jsonb_agg(control) FROM build_control(bg.gender_control, p_locale) AS control)
        )
    FROM groups_with_categories bg
    LIMIT p_limit_by;
END;
$function$

