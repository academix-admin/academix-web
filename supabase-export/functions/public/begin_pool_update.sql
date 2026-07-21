-- schema:   public
-- function: begin_pool_update()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.begin_pool_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
      IF NEW.pools_visible = TRUE THEN 
        PERFORM update_pool_status(NEW.pools_id);
      ELSIF NEW.pools_visible = FALSE AND NEW.pools_starting_at THEN
        PERFORM update_pool_status(NEW.pools_id,NULL, FALSE);
      END IF;
RETURN NULL;
END;
$function$

