-- schema:   public
-- function: translate(translations jsonb, requested_locale text, fallback_locales text[], use_default boolean)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.translate(translations jsonb, requested_locale text, fallback_locales text[] DEFAULT ARRAY[]::text[], use_default boolean DEFAULT false)
 RETURNS TABLE(translation text, record jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_locale text;
    resolved_value text;
BEGIN
    -- Fast path: requested locale exists
    IF translations ? requested_locale THEN
        RETURN QUERY SELECT 
            translations ->> requested_locale,
            jsonb_build_object(
                'locale', requested_locale,
                'value', translations ->> requested_locale,
                'source', 'requested'
            );
        RETURN;
    END IF;

    -- Check fallback locales
    SELECT t.value, t.key INTO resolved_value, current_locale
    FROM jsonb_each_text(translations) t
    WHERE t.key = ANY(fallback_locales)
    LIMIT 1;

    IF current_locale IS NOT NULL THEN
        RETURN QUERY SELECT 
            resolved_value,
            jsonb_build_object(
                'locale', current_locale,
                'value', resolved_value,
                'source', 'fallback'
            );
        RETURN;
    END IF;

    -- Check default locale if enabled
    IF use_default = TRUE THEN
        RETURN QUERY SELECT 
            translations ->> 'default',
            jsonb_build_object(
                'locale', 'default',
                'value', translations ->>'default',
                'source', 'default'
            );
        RETURN;
    END IF;

    -- Final fallback - return NULL
    RETURN QUERY SELECT 
        NULL,
        jsonb_build_object(
            'locale', requested_locale,
            'value', NULL,
            'source', 'none'
        );
END;
$function$

