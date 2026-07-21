-- schema:   public
-- function: reformat_text(input_text text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.reformat_text(input_text text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Trim leading and trailing whitespace
  input_text := TRIM(input_text);

  -- Split the text into words
  IF POSITION(' ' IN input_text) > 0 THEN
    RETURN SPLIT_PART(input_text, ' ', 1) || ' ' || SPLIT_PART(input_text, ' ', array_length(regexp_split_to_array(input_text, '\s+'), 1));
  ELSE
    -- If there's only one word, return it unchanged
    RETURN input_text;
  END IF;
END;
$function$

