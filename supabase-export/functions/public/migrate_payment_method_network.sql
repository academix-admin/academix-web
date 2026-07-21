-- schema:   public
-- function: migrate_payment_method_network()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.migrate_payment_method_network()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE your_table_name
  SET payment_method_network_new = (
    SELECT jsonb_agg(jsonb_build_object(
      'image', payment_method_image,
      'identity', identity,
      'active', true
    ))
    FROM jsonb_array_elements_text(payment_method_network::jsonb) AS identity
  )
  WHERE payment_method_network IS NOT NULL;
END;
$function$

