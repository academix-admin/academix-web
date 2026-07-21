-- schema:   public
-- function: preserve_option_identity(p_option text, p_type text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.preserve_option_identity(p_option text, p_type text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_option TEXT;
BEGIN
    CASE p_type 
        WHEN 'QuestionType.slider' THEN 
             new_option := '';
        WHEN 'QuestionType.fill_gap' THEN 
             new_option := '';
        ELSE
             new_option := p_option;
    END CASE;
    
    RETURN new_option;
END;
$function$

