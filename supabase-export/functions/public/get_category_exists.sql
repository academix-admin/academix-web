-- schema:   public
-- function: get_category_exists(p_name text, p_user_id uuid, p_group_id uuid, p_public boolean, p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_category_exists(p_name text, p_user_id uuid, p_group_id uuid, p_public boolean, p_locale text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    is_personal BOOLEAN;
    check_public BOOLEAN;
    exists BOOLEAN;
BEGIN

   SELECT rt.roles_is_personal_entry INTO is_personal
   FROM users_table ut 
   LEFT JOIN roles_table rt ON rt.roles_id = ut.roles_id
   WHERE ut.users_id = p_user_id;

   IF is_personal IS NULL THEN
      RETURN jsonb_build_object(
        'is_public', false,
        'exists', NULL,
        'allowed', false
      );
   ELSIF is_personal = TRUE THEN
          check_public := COALESCE(p_public, FALSE);
   ELSE 
         check_public := TRUE;     
   END IF;

   -- Check if any value in the topic_category_identity JSONB matches p_name (by visibility)
   IF check_public = TRUE THEN 
        SELECT EXISTS (
            SELECT 1 FROM topic_category_table tct
            WHERE EXISTS (
                SELECT translation FROM translate(tct.topic_category_identity, p_locale) 
                WHERE UNACCENT(LOWER(translation)) = UNACCENT(LOWER(p_name))
            )
            AND tct.visibility = 'public'
        ) INTO exists;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM topic_category_table tct
            WHERE EXISTS (
                SELECT translation FROM translate(tct.topic_category_identity, p_locale) 
                WHERE UNACCENT(LOWER(translation)) = UNACCENT(LOWER(p_name))
            )
            AND tct.visibility = 'private'
            AND (SELECT (translation::uuid) FROM translate(tct.topic_category_created_by, p_locale)) = p_user_id
        ) INTO exists;
     END IF;

    RETURN jsonb_build_object(
        'is_public', check_public,
        'exists', exists,
        'allowed', true
      );
END;
$function$

