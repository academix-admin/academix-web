-- schema:   public
-- function: get_column_ownership(p_tables text[])
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_column_ownership(p_tables text[])
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_sorted_tables TEXT[];
    v_cache_key     TEXT;
    v_guc_name      TEXT;
    v_cached_raw    TEXT;
    v_result        JSONB;
BEGIN
    -- 1. Deterministic cache key from sorted table names
    SELECT ARRAY_AGG(t ORDER BY t) INTO v_sorted_tables FROM UNNEST(p_tables) t;
    v_cache_key := array_to_string(v_sorted_tables, ',');

    -- GUC names must be namespace.key and lowercase, no special chars
    -- We use a fixed namespace 'app' and an md5 of the key for safety
    v_guc_name := 'app.col_cache_' || md5(v_cache_key);

    -- 2. Try to read from session GUC cache (no table, no permissions needed)
    BEGIN
        v_cached_raw := current_setting(v_guc_name);
        IF v_cached_raw IS NOT NULL AND v_cached_raw <> '' THEN
            RETURN v_cached_raw::JSONB;
        END IF;
    EXCEPTION
        -- current_setting raises error when GUC doesn't exist (pre-PG14 behaviour)
        WHEN undefined_object THEN
            NULL; -- cache miss, fall through
        WHEN OTHERS THEN
            NULL; -- safety net, fall through
    END;

    -- 3. Cache miss — query pg_catalog (faster than information_schema, no view overhead)
    SELECT jsonb_object_agg(
        a.attname,
        c.relname
        ORDER BY
            array_position(v_sorted_tables, c.relname::text),
            a.attnum
    ) INTO v_result
    FROM pg_catalog.pg_attribute  a
    JOIN pg_catalog.pg_class      c ON c.oid  = a.attrelid
    JOIN pg_catalog.pg_namespace  n ON n.oid  = c.relnamespace
    WHERE n.nspname      = 'public'
      AND c.relname      = ANY(v_sorted_tables)
      AND a.attnum       > 0           -- exclude system columns
      AND NOT a.attisdropped;         -- exclude dropped columns

    -- 4. Store in session-level GUC (is_local = false → persists for session lifetime)
    PERFORM set_config(v_guc_name, v_result::TEXT, false);

    RETURN v_result;
END;
$function$

