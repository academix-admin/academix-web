-- schema:   public
-- function: translate(translations jsonb, requested_locale text, fallback_locales text[])
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.translate(translations jsonb, requested_locale text, fallback_locales text[] DEFAULT ARRAY['en'])
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

    -- Check fallback locales (defaults to 'en' — every existing caller that doesn't pass this
    -- explicitly now falls back to English instead of returning NULL when the requested locale
    -- has no translation. NULL was a verified-live production crash: it fed straight into
    -- domain-types contract fields declared non-nullable, e.g. BackendCountryData.country_identity
    -- / BackendLanguageData.language_identity via get_user_record.)
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

    -- Final fallback - return NULL (only reached if neither the requested locale NOR any
    -- fallback_locales entry has a translation for this row — a genuinely untranslated row, not
    -- just a locale mismatch). Dropped the old use_default/'default'-key branch: no row in any
    -- translations jsonb across the schema actually carries a literal 'default' key, so it was
    -- dead code that could never resolve to anything.
    RETURN QUERY SELECT
        NULL,
        jsonb_build_object(
            'locale', requested_locale,
            'value', NULL,
            'source', 'none'
        );
END;
$function$
