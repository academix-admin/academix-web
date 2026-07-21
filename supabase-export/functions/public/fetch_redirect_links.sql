-- schema:   public
-- function: fetch_redirect_links(p_links text[])
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_redirect_links(p_links text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE 
  links JSONB;
BEGIN
  SELECT jsonb_object_agg(rlt.redirect_link_id, rlt.redirect_link_value)
  INTO links
  FROM redirect_link_table rlt
  WHERE rlt.redirect_link_id = ANY(p_links);
  
  RETURN COALESCE(links, '{}'::JSONB);                  
END;
$function$

