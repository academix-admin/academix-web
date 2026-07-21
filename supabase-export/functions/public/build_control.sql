-- schema:   public
-- function: build_control(controls jsonb, requested_locale text, fallback_locales text[], use_default boolean)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.build_control(controls jsonb, requested_locale text DEFAULT NULL::text, fallback_locales text[] DEFAULT ARRAY[]::text[], use_default boolean DEFAULT false)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    locale_to_use text;
    locale_data jsonb;
    control_key text;
    control_data jsonb;
    translation_result text;
    value_boolean boolean;
BEGIN
    -- Determine which locale to use
    IF requested_locale IS NOT NULL AND controls ? requested_locale THEN
        locale_to_use := requested_locale;
    ELSIF array_length(fallback_locales, 1) > 0 THEN
        -- Try fallback locales in order
        FOR i IN 1..array_length(fallback_locales, 1) LOOP
            IF controls ? fallback_locales[i] THEN
                locale_to_use := fallback_locales[i];
                EXIT;
            END IF;
        END LOOP;
    END IF;
    
    -- If still no locale found and use_default is true, try to find any locale
    IF locale_to_use IS NULL AND use_default THEN
        -- Get the first available locale
        SELECT jsonb_object_keys(controls) INTO locale_to_use
        LIMIT 1;
    END IF;
    
    -- If no locale found, return empty set
    IF locale_to_use IS NULL THEN
        RETURN;
    END IF;
    
    -- Get the data for the selected locale
    locale_data := controls -> locale_to_use;
    
    -- Loop through each control key in the locale data
    FOR control_key IN SELECT jsonb_object_keys(locale_data)
    LOOP
        -- Get the control data for the current key
        control_data := locale_data -> control_key;
        
        -- Extract value and title
        value_boolean := (control_data ->> 'value')::BOOLEAN;
        translation_result := control_data ->> 'title';
        
        -- Return the result
        RETURN QUERY 
        SELECT jsonb_build_object(
            'control_key', control_key,
            'control_value', value_boolean,
            'control_title', translation_result
        );
    END LOOP;
END;
$function$

