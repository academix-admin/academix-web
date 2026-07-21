-- schema:   public
-- function: get_user_fields(p_user_id uuid, p_fields text[], p_locale text, p_transform text[], p_translate text[])
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_user_fields(p_user_id uuid, p_fields text[], p_locale text DEFAULT 'en'::text, p_transform text[] DEFAULT NULL::text[], p_translate text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_result        JSONB := '{}'::JSONB;
    v_user_jsonb    JSONB;
    v_user_exists   BOOLEAN;

    v_roles_jsonb    JSONB;
    v_language_jsonb JSONB;
    v_country_jsonb  JSONB;
    v_referred_jsonb JSONB;

    v_want_roles    BOOLEAN := false;
    v_want_language BOOLEAN := false;
    v_want_country  BOOLEAN := false;
    v_want_referred BOOLEAN := false;

    v_roles_fields    TEXT[] := '{}';
    v_language_fields TEXT[] := '{}';
    v_country_fields  TEXT[] := '{}';
    v_referred_fields TEXT[] := '{}';
    v_user_fields     TEXT[] := '{}';

    v_users_cols   JSONB;
    v_roles_cols   JSONB;
    v_language_cols JSONB;
    v_country_cols  JSONB;
    v_master_map    JSONB;

    v_transform_map JSONB := '{}'::JSONB;
    v_transform_i   INT;

    v_field       TEXT;
    v_col_rec     RECORD;
    v_table_owner TEXT;
    v_nested      JSONB;
    v_output_key  TEXT;
    v_raw_value   TEXT;
    v_translated  TEXT;

    d_result JSONB := '{
        "users_id":             null,
        "users_username":       "unknown",
        "users_names":          "Unknown User",
        "users_email":          "unknown@example.com",
        "users_dob":            "",
        "users_sex":            "",
        "users_profile_index":  null,
        "roles_id":             null,
        "users_active":         false,
        "users_verified":       false,
        "country_id":           null,
        "language_id":          null,
        "users_created_at":     "",
        "users_updated_at":     "",
        "users_phone":          "",
        "users_login_type":     "",
        "users_referred_id":    null,
        "users_referred_status":"Referral.none",
        "sort_created_id":      "",
        "users_image":          null
    }'::JSONB;
BEGIN

    -- ----------------------------------------------------------------
    -- 0. Build transform map from flat pairs  [key, alias, key, alias…]
    -- ----------------------------------------------------------------
    IF p_transform IS NOT NULL AND array_length(p_transform, 1) IS NOT NULL THEN
        v_transform_i := 1;
        WHILE v_transform_i + 1 <= array_length(p_transform, 1) LOOP
            v_transform_map := v_transform_map || jsonb_build_object(
                p_transform[v_transform_i],
                p_transform[v_transform_i + 1]
            );
            v_transform_i := v_transform_i + 2;
        END LOOP;
    END IF;

    -- ----------------------------------------------------------------
    -- 1. Column-ownership map (session-cached, zero-cost on repeat calls)
    -- ----------------------------------------------------------------
    v_master_map := get_column_ownership(
        ARRAY['users_table', 'roles_table', 'language_table', 'country_table']
    );

    -- Per-table column-existence sets for fast membership testing
    SELECT
        jsonb_object_agg(key, true) FILTER (WHERE value = '"users_table"'),
        jsonb_object_agg(key, true) FILTER (WHERE value = '"roles_table"'),
        jsonb_object_agg(key, true) FILTER (WHERE value = '"language_table"'),
        jsonb_object_agg(key, true) FILTER (WHERE value = '"country_table"')
    INTO v_users_cols, v_roles_cols, v_language_cols, v_country_cols
    FROM jsonb_each(v_master_map);

    -- ----------------------------------------------------------------
    -- 2. Fetch the user record
    -- ----------------------------------------------------------------
    SELECT to_jsonb(u) INTO v_user_jsonb
    FROM public.users_table u
    WHERE u.users_id = p_user_id;

    v_user_exists := v_user_jsonb IS NOT NULL;

    IF NOT v_user_exists THEN
        v_user_jsonb := d_result || jsonb_build_object(
            'users_id', COALESCE(p_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
        );
    END IF;

    -- ----------------------------------------------------------------
    -- 3. Bucket requested fields into per-table arrays
    -- ----------------------------------------------------------------
    FOREACH v_field IN ARRAY p_fields LOOP
        IF v_field LIKE 'users_referred_%' THEN
            v_want_referred  := true;
            v_referred_fields := array_append(v_referred_fields, v_field);
        END IF;
    END LOOP;

    FOR v_col_rec IN
        SELECT key AS col_name, value AS tbl_name
        FROM jsonb_each_text(v_master_map)
    LOOP
        CONTINUE WHEN NOT (v_col_rec.col_name = ANY(p_fields));
        CONTINUE WHEN v_col_rec.col_name LIKE 'users_referred_%';

        v_table_owner := v_col_rec.tbl_name;

        CASE v_table_owner
            WHEN 'users_table' THEN
                v_user_fields := array_append(v_user_fields, v_col_rec.col_name);
                -- A column owned by users_table may also indicate we need a join
                -- only if it is a FK that lives in a related table too.
                -- The original logic checked the wrong direction; keep it as-is
                -- to preserve existing behaviour.
                IF v_roles_cols    ? v_col_rec.col_name THEN v_want_roles    := true; END IF;
                IF v_language_cols ? v_col_rec.col_name THEN v_want_language := true; END IF;
                IF v_country_cols  ? v_col_rec.col_name THEN v_want_country  := true; END IF;
            WHEN 'roles_table' THEN
                v_want_roles   := true;
                v_roles_fields := array_append(v_roles_fields, v_col_rec.col_name);
            WHEN 'language_table' THEN
                v_want_language    := true;
                v_language_fields  := array_append(v_language_fields, v_col_rec.col_name);
            WHEN 'country_table' THEN
                v_want_country  := true;
                v_country_fields := array_append(v_country_fields, v_col_rec.col_name);
            ELSE
                v_result := v_result || jsonb_build_object(v_col_rec.col_name, null);
        END CASE;
    END LOOP;

    -- ----------------------------------------------------------------
    -- 4. Fetch related records only when actually needed
    -- ----------------------------------------------------------------
    IF v_want_roles AND v_user_exists THEN
        SELECT to_jsonb(r) INTO v_roles_jsonb
        FROM public.roles_table r
        WHERE r.roles_id = (v_user_jsonb->>'roles_id')::uuid;
    END IF;

    IF v_want_language AND v_user_exists THEN
        SELECT to_jsonb(l) INTO v_language_jsonb
        FROM public.language_table l
        WHERE l.language_id = (v_user_jsonb->>'language_id')::uuid;
    END IF;

    IF v_want_country AND v_user_exists THEN
        SELECT to_jsonb(c) INTO v_country_jsonb
        FROM public.country_table c
        WHERE c.country_id = (v_user_jsonb->>'country_id')::uuid;
    END IF;

    IF v_want_referred AND v_user_exists
       AND (v_user_jsonb->>'users_referred_id') IS NOT NULL THEN
        SELECT jsonb_object_agg('users_referred_' || key, value)
        INTO v_referred_jsonb
        FROM jsonb_each(
            (SELECT to_jsonb(u)
             FROM public.users_table u
             WHERE u.users_id = (v_user_jsonb->>'users_referred_id')::uuid)
        );
    END IF;

    -- ----------------------------------------------------------------
    -- 5. Flat users_table fields
    -- ----------------------------------------------------------------
    FOREACH v_field IN ARRAY v_user_fields LOOP
        IF NOT v_user_exists THEN
            v_result := v_result || jsonb_build_object(v_field, d_result->v_field);
        ELSIF p_translate IS NOT NULL AND v_field = ANY(p_translate) AND p_locale IS NOT NULL THEN
            v_raw_value := v_user_jsonb ->> v_field;
            IF v_raw_value IS NOT NULL THEN
                SELECT translation INTO v_translated
                FROM translate(v_raw_value::jsonb, p_locale);
            ELSE
                v_translated := null;
            END IF;
            v_result := v_result || jsonb_build_object(v_field, v_translated);
        ELSE
            v_result := v_result || jsonb_build_object(v_field, v_user_jsonb->v_field);
        END IF;
    END LOOP;

    -- ----------------------------------------------------------------
    -- 6. Nested roles_table
    -- ----------------------------------------------------------------
    IF v_want_roles THEN
        v_output_key := COALESCE(v_transform_map->>'roles_table', 'roles_table');
        v_nested := jsonb_build_object(
            'roles_id',
            CASE WHEN v_user_exists THEN v_user_jsonb->'roles_id' ELSE null END
        );
        FOREACH v_field IN ARRAY v_roles_fields LOOP
            CONTINUE WHEN v_field = 'roles_id';
            IF p_translate IS NOT NULL AND v_field = ANY(p_translate)
               AND p_locale IS NOT NULL AND v_roles_jsonb IS NOT NULL THEN
                v_raw_value := v_roles_jsonb ->> v_field;
                IF v_raw_value IS NOT NULL THEN
                    SELECT translation INTO v_translated
                    FROM translate(v_raw_value::jsonb, p_locale);
                ELSE v_translated := null; END IF;
                v_nested := v_nested || jsonb_build_object(v_field, v_translated);
            ELSE
                v_nested := v_nested || jsonb_build_object(
                    v_field,
                    CASE WHEN v_roles_jsonb IS NOT NULL THEN v_roles_jsonb->v_field ELSE null END
                );
            END IF;
        END LOOP;
        v_result := v_result || jsonb_build_object(v_output_key, v_nested);
    END IF;

    -- ----------------------------------------------------------------
    -- 7. Nested language_table
    -- ----------------------------------------------------------------
    IF v_want_language THEN
        v_output_key := COALESCE(v_transform_map->>'language_table', 'language_table');
        v_nested := jsonb_build_object(
            'language_id',
            CASE WHEN v_user_exists THEN v_user_jsonb->'language_id' ELSE null END
        );
        FOREACH v_field IN ARRAY v_language_fields LOOP
            CONTINUE WHEN v_field = 'language_id';
            IF p_translate IS NOT NULL AND v_field = ANY(p_translate)
               AND p_locale IS NOT NULL AND v_language_jsonb IS NOT NULL THEN
                v_raw_value := v_language_jsonb ->> v_field;
                IF v_raw_value IS NOT NULL THEN
                    SELECT translation INTO v_translated
                    FROM translate(v_raw_value::jsonb, p_locale);
                ELSE v_translated := null; END IF;
                v_nested := v_nested || jsonb_build_object(v_field, v_translated);
            ELSE
                v_nested := v_nested || jsonb_build_object(
                    v_field,
                    CASE WHEN v_language_jsonb IS NOT NULL THEN v_language_jsonb->v_field ELSE null END
                );
            END IF;
        END LOOP;
        v_result := v_result || jsonb_build_object(v_output_key, v_nested);
    END IF;

    -- ----------------------------------------------------------------
    -- 8. Nested country_table
    -- ----------------------------------------------------------------
    IF v_want_country THEN
        v_output_key := COALESCE(v_transform_map->>'country_table', 'country_table');
        v_nested := jsonb_build_object(
            'country_id',
            CASE WHEN v_user_exists THEN v_user_jsonb->'country_id' ELSE null END
        );
        FOREACH v_field IN ARRAY v_country_fields LOOP
            CONTINUE WHEN v_field = 'country_id';
            IF p_translate IS NOT NULL AND v_field = ANY(p_translate)
               AND p_locale IS NOT NULL AND v_country_jsonb IS NOT NULL THEN
                v_raw_value := v_country_jsonb ->> v_field;
                IF v_raw_value IS NOT NULL THEN
                    SELECT translation INTO v_translated
                    FROM translate(v_raw_value::jsonb, p_locale);
                ELSE v_translated := null; END IF;
                v_nested := v_nested || jsonb_build_object(v_field, v_translated);
            ELSE
                v_nested := v_nested || jsonb_build_object(
                    v_field,
                    CASE WHEN v_country_jsonb IS NOT NULL THEN v_country_jsonb->v_field ELSE null END
                );
            END IF;
        END LOOP;
        v_result := v_result || jsonb_build_object(v_output_key, v_nested);
    END IF;

    -- ----------------------------------------------------------------
    -- 9. Nested users_referred_table
    -- ----------------------------------------------------------------
    IF v_want_referred THEN
        v_output_key := COALESCE(v_transform_map->>'users_referred_table', 'users_referred_table');
        v_nested := jsonb_build_object(
            'users_referred_id',
            CASE WHEN v_user_exists THEN v_user_jsonb->'users_referred_id' ELSE null END
        );
        FOREACH v_field IN ARRAY v_referred_fields LOOP
            CONTINUE WHEN v_field = 'users_referred_id';
            IF p_translate IS NOT NULL AND v_field = ANY(p_translate)
               AND p_locale IS NOT NULL AND v_referred_jsonb IS NOT NULL THEN
                v_raw_value := v_referred_jsonb ->> v_field;
                IF v_raw_value IS NOT NULL THEN
                    SELECT translation INTO v_translated
                    FROM translate(v_raw_value::jsonb, p_locale);
                ELSE v_translated := null; END IF;
                v_nested := v_nested || jsonb_build_object(v_field, v_translated);
            ELSE
                v_nested := v_nested || jsonb_build_object(
                    v_field,
                    CASE WHEN v_referred_jsonb IS NOT NULL THEN v_referred_jsonb->v_field ELSE null END
                );
            END IF;
        END LOOP;
        v_result := v_result || jsonb_build_object(v_output_key, v_nested);
    END IF;

    RETURN v_result;
END;
$function$

