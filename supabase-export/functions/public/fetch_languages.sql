-- schema:   public
-- function: fetch_languages(p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_languages(p_locale text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
        RETURN QUERY SELECT 
        jsonb_build_object(
            'language_id', lt.language_id,
            'language_identity',(SELECT translation FROM translate(lt.language_identity,p_locale)),
            'language_symbol', '',
            'language_created_at', lt.language_created_at,
            'language_code', lt.language_code
        )
        FROM language_table lt
        WHERE lt.language_visible = TRUE;

END;
$function$

