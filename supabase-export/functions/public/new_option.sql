-- schema:   public
-- function: new_option(question_id uuid, option text, option_is_correct boolean, translation jsonb, option_language text, user_id uuid, locale text, min numeric, max numeric, unit text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.new_option(question_id uuid, option text, option_is_correct boolean, translation jsonb, option_language text, user_id uuid, locale text, min numeric DEFAULT NULL::numeric, max numeric DEFAULT NULL::numeric, unit text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    translation_data RECORD;
    option_data JSONB;

    translation_keys TEXT;
    translation_values TEXT;


    final_json JSONB;


BEGIN

    -- Aggregate and insert translation data if present
    IF translation IS NOT NULL THEN
        SELECT string_agg(quote_ident(key), ', '),
               string_agg(quote_literal(replace(value::TEXT, '"', '')), ', ')
        INTO translation_keys, translation_values
        FROM jsonb_each(translation);

        EXECUTE format(
            'INSERT INTO translation_table (%s, translation_default_locale) VALUES (%s, %L) RETURNING *',
            translation_keys,
            translation_values,
            option_language
        ) INTO translation_data;
    END IF;


    -- Insert into main topic table
    INSERT INTO options_table (
        questions_id,
        options_identity,
        options_is_correct,
        translation_id,
        options_min,
        options_max,
        options_unit
    )
    VALUES (
        question_id,
        option,
        option_is_correct,
        translation_data.translation_id,
        min,
        max,
        unit
        )
    RETURNING row_to_json(options_table.*) INTO option_data;



    -- Return the final topic data as JSONB
    final_json := jsonb_build_object(
        'options_id', option_data->>'options_id',
        'options_created_at', option_data->>'options_created_at',
        'options_identity', option_data->>'options_identity',
        'options_is_correct',option_data->>'options_is_correct',
        'options_min',option_data->>'options_min',
        'options_max',option_data->>'options_max',
        'options_unit',option_data->>'options_unit'
    );


    RETURN final_json;
END;
$function$

