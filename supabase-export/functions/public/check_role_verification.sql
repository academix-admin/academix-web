-- schema:   public
-- function: check_role_verification(p_users_id uuid, p_roles_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.check_role_verification(p_users_id uuid DEFAULT NULL::uuid, p_roles_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_roles_id      uuid;
  v_roles_level   int;
  v_roles_checker text;
  v_roles_access  jsonb;
  v_verification  boolean;
BEGIN
  IF p_users_id IS NULL AND p_roles_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'RolesVerification.failed',
      'error',  'Missing fields',
      'data',   NULL
    );
  END IF;

  IF p_users_id IS NOT NULL THEN
    SELECT rt.roles_id, rt.roles_level, rt.roles_checker, rt.roles_access
    INTO   v_roles_id, v_roles_level, v_roles_checker, v_roles_access
    FROM   public.users_table ut
    JOIN   public.roles_table rt ON rt.roles_id = ut.roles_id
    WHERE  ut.users_id = p_users_id;
  ELSE
    SELECT roles_id, roles_level, roles_checker, roles_access
    INTO   v_roles_id, v_roles_level, v_roles_checker, v_roles_access
    FROM   public.roles_table
    WHERE  roles_id = p_roles_id;
  END IF;

  IF v_roles_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'RolesVerification.error',
      'error',  'Not found',
      'data',   NULL
    );
  END IF;

  v_verification := (v_roles_checker = 'Roles.student' AND v_roles_level = 1);

  RETURN jsonb_build_object(
    'status', 'RolesVerification.success',
    'error',  NULL,
    'data',   jsonb_build_object(
      'verification',  v_verification,
      'roles_id',      v_roles_id,
      'roles_checker', v_roles_checker,
      'roles_level',   v_roles_level,
      'roles_access',  v_roles_access   -- full map for Lambda to store
    )
  );
END;
$function$

