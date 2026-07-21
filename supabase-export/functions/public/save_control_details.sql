-- schema:   public
-- function: save_control_details(control_type text, control_defaults jsonb[], p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.save_control_details(control_type text, control_defaults jsonb[], p_locale text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result    JSONB;
    base_data JSONB;
BEGIN
    IF p_locale IS NULL THEN
        RAISE EXCEPTION 'p_locale cannot be null';
    END IF;

    CASE control_type

        WHEN 'Control.language' THEN
            SELECT jsonb_object_agg(
                lower(lt.language_code),
                jsonb_build_object(
                    'title', t.translation,
                    'value', COALESCE(
                        (
                            SELECT (elem ->> 'value')::boolean
                            FROM unnest(control_defaults) AS elem
                            WHERE (elem ->> 'id') = lower(lt.language_code)
                        ),
                        true
                    )
                )
            )
            INTO base_data
            FROM language_table lt
            CROSS JOIN LATERAL translate(lt.language_identity, p_locale) AS t
            WHERE lt.language_visible = true;

        WHEN 'Control.country' THEN
            SELECT jsonb_object_agg(
                lower(ct.country_two_iso_code),
                jsonb_build_object(
                    'title', t.translation,
                    'value', COALESCE(
                        (
                            SELECT (elem ->> 'value')::boolean
                            FROM unnest(control_defaults) AS elem
                            WHERE (elem ->> 'id') = lower(ct.country_two_iso_code)
                        ),
                        true
                    )
                )
            )
            INTO base_data
            FROM country_table ct
            CROSS JOIN LATERAL translate(ct.country_identity, p_locale) AS t
            WHERE ct.country_visible = true;

        WHEN 'Control.gender' THEN
            SELECT jsonb_object_agg(
                lower(gt.gender_id),
                jsonb_build_object(
                    'title', t.translation,
                    'value', COALESCE(
                        (
                            SELECT (elem ->> 'value')::boolean
                            FROM unnest(control_defaults) AS elem
                            WHERE (elem ->> 'id') = lower(gt.gender_id)
                        ),
                        true
                    )
                )
            )
            INTO base_data
            FROM gender_table gt
            CROSS JOIN LATERAL translate(gt.gender_identity, p_locale) AS t
            WHERE gt.gender_visible = true;

        WHEN 'Control.age' THEN
            SELECT jsonb_object_agg(
                lower(at.age_id::text),
                jsonb_build_object(
                    'title', t.translation,
                    'value', COALESCE(
                        (
                            SELECT (elem ->> 'value')::boolean
                            FROM unnest(control_defaults) AS elem
                            WHERE (elem ->> 'id') = lower(at.age_id::text)
                        ),
                        true
                    )
                )
            )
            INTO base_data
            FROM age_table at
            CROSS JOIN LATERAL translate(at.age_identity, p_locale) AS t
            WHERE at.age_visible = true;

        ELSE
            RETURN jsonb_build_object(p_locale, '{}'::jsonb);

    END CASE;

    IF base_data IS NULL THEN
        base_data := '{}'::jsonb;
    END IF;

    RETURN jsonb_build_object(p_locale, base_data);

END;
$function$

