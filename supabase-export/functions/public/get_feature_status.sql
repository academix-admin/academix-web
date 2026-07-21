-- schema:   public
-- function: get_feature_status(p_feature text, p_country text, p_locale text, p_gender text, p_age text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_feature_status(p_feature text, p_country text, p_locale text, p_gender text, p_age text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE 
    result jsonb;
BEGIN
        SELECT
            jsonb_build_object(
                    'features_active', ft.features_active
            ) INTO result
        FROM  features_table ft
        WHERE ft.features_checker = p_feature
        AND (SELECT value FROM decontrol(ft.language_control,p_locale, p_locale)) = TRUE
        AND (SELECT value FROM decontrol(ft.country_control,p_country, p_locale)) = TRUE
        AND (SELECT value FROM decontrol(ft.gender_control,p_gender, p_locale)) = TRUE
        AND (SELECT value FROM decontrol(ft.age_control,p_age, p_locale)) = TRUE
        LIMIT 1;

       IF result IS NULL then
            RETURN jsonb_build_object(
                    'features_active', FALSE
            );
       END IF; 

    RETURN result;    
END; $function$

