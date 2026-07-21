-- schema:   public
-- function: fetch_country(p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_country(p_locale text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
        RETURN QUERY SELECT 
        jsonb_build_object(
            'country_id', ct.country_id,
            'country_identity',(SELECT translation FROM translate(ct.country_identity::JSONB,p_locale)),
            'country_phone_code', ct.country_phone_code,
            'country_phone_digit', ct.country_phone_digit,
            'country_three_iso_code', ct.country_three_iso_code,
            'country_two_iso_code', ct.country_two_iso_code,
            'country_image', ct.country_image,
            'country_created_at', ct.country_created_at
        )
        FROM country_table ct
        WHERE ct.country_visible = TRUE;

END;
$function$

