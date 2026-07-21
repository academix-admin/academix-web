-- schema:   public
-- function: get_fresh_control_details(control_type text, p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_fresh_control_details(control_type text, p_locale text DEFAULT NULL::text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    controls_json JSONB;
BEGIN
    IF p_locale IS NULL THEN
        RETURN;
    END IF;

    CASE control_type

        WHEN 'Control.language' THEN
            SELECT jsonb_object_agg(
                lower(lt.language_code),
                jsonb_build_object('title', t.translation, 'value', TRUE)
            )
            INTO controls_json
            FROM language_table lt
            CROSS JOIN LATERAL translate(lt.language_identity, p_locale) AS t
            WHERE lt.language_visible = true;

        WHEN 'Control.country' THEN
            SELECT jsonb_object_agg(
                lower(ct.country_two_iso_code),
                jsonb_build_object('title', t.translation, 'value', TRUE)
            )
            INTO controls_json
            FROM country_table ct
            CROSS JOIN LATERAL translate(ct.country_identity, p_locale) AS t
            WHERE ct.country_visible = true;

        WHEN 'Control.gender' THEN
            SELECT jsonb_object_agg(
                lower(gt.gender_id),
                jsonb_build_object('title', t.translation, 'value', TRUE)
            )
            INTO controls_json
            FROM gender_table gt
            CROSS JOIN LATERAL translate(gt.gender_identity, p_locale) AS t
            WHERE gt.gender_visible = true;

        WHEN 'Control.age' THEN
            SELECT jsonb_object_agg(
                lower(at.age_id::text),
                jsonb_build_object('title', t.translation, 'value', TRUE)
            )
            INTO controls_json
            FROM age_table at
            CROSS JOIN LATERAL translate(at.age_identity, p_locale) AS t
            WHERE at.age_visible = true;

        ELSE
            RETURN;

    END CASE;

    IF controls_json IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT jsonb_build_object(
        'control_key',   t.key,
        'control_value', (t.value ->> 'value')::boolean,
        'control_title',  t.value ->> 'title'
    )
    FROM jsonb_each(controls_json) AS t(key, value);

END;
$function$

