-- schema:   public
-- function: decontrol(controls jsonb, requested_control text, requested_locale text, fallback_locales text[], use_default boolean)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.decontrol(controls jsonb, requested_control text, requested_locale text DEFAULT NULL::text, fallback_locales text[] DEFAULT ARRAY[]::text[], use_default boolean DEFAULT false)
 RETURNS TABLE(value boolean, translation text, record jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    locale_to_use text;
    locale_data jsonb;
    control_data jsonb;
    translation_result text;
    translation_record jsonb;
    found boolean := false;
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
    
    -- If we have a locale to use, get the control data
    IF locale_to_use IS NOT NULL THEN
        locale_data := controls -> locale_to_use;
        
        -- Check if the requested control exists in this locale
        IF locale_data ? requested_control THEN
            control_data := locale_data -> requested_control;
            found := true;
        END IF;
    END IF;
    
    IF NOT found OR control_data IS NULL THEN
        -- Control not found in any locale
        RETURN QUERY SELECT 
            NULL::boolean,
            NULL::text,
            jsonb_build_object(
                'control', requested_control,
                'found', false,
                'value', NULL,
                'translation', NULL,
                'locale_used', locale_to_use,
                'source', 'none'
            );
        RETURN;
    END IF;
    
    -- Extract the value
    value := (control_data ->> 'value')::BOOLEAN;
    
    -- Get the title directly from control_data (it's now a string, not an object)
    translation_result := control_data ->> 'title';
    
    -- Return the result
    RETURN QUERY SELECT 
        value,
        translation_result,
        jsonb_build_object(
            'control', requested_control,
            'found', true,
            'value', value,
            'translation', translation_result,
            'locale_used', locale_to_use,
            'source', 'direct'
        );
    RETURN;
END;
$function$

