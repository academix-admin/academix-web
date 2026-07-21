-- schema:   public
-- function: permission_checker(owner_id uuid, viewer_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.permission_checker(owner_id uuid, viewer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_checker    text;
  owner_access jsonb;
BEGIN
  -- 1. Resolve the viewer's roles_checker string
  SELECT rt.roles_checker
  INTO   v_checker
  FROM   public.users_table ut
  JOIN   public.roles_table rt ON rt.roles_id = ut.roles_id
  WHERE  ut.users_id = viewer_id;

  IF v_checker IS NULL THEN
    RETURN false;
  END IF;

  -- 2. Load the owner's personal RBAC map
  SELECT users_roles_access
  INTO   owner_access
  FROM   public.users_table
  WHERE  users_id = owner_id;

  IF owner_access IS NULL THEN
    RETURN false;
  END IF;

  -- 3. Navigate roles -> {viewer_checker} -> view
  RETURN COALESCE(
    (owner_access #>> ARRAY['roles', v_checker, 'view'])::boolean,
    false
  );

EXCEPTION
  WHEN OTHERS THEN RETURN false;
END;
$function$

