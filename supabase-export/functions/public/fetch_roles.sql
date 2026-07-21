-- schema:   public
-- function: fetch_roles(p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.fetch_roles(p_locale text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'roles_id',         rt.roles_id,
    'roles_checker',    rt.roles_checker,
    'roles_level',      rt.roles_level,
    'roles_created_at', rt.roles_created_at,
    'roles_buy_in',     rt.roles_buy_in,
    -- Translate identity string via existing translate function
    'roles_identity',   (SELECT translation FROM translate(rt.roles_identity, p_locale)),
    -- Extract localised perks array — fallback to 'en' if locale not found
    'roles_perks',      COALESCE(
                          rt.roles_perks->p_locale,
                          rt.roles_perks->'en',
                          '[]'::JSONB
                        )
  )
  FROM roles_table rt
  WHERE rt.roles_is_public = TRUE
  ORDER BY rt.roles_level DESC;
END;
$function$

