-- schema:   public
-- function: get_database_time()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_database_time()
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN NOW();
END;
$function$

