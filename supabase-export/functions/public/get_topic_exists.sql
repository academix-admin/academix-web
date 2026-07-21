-- schema:   public
-- function: get_topic_exists(p_name text, p_user_id uuid, p_category_id uuid, p_public boolean, p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_topic_exists(p_name text, p_user_id uuid, p_category_id uuid, p_public boolean, p_locale text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    is_personal BOOLEAN;
    check_public BOOLEAN;
    exists BOOLEAN;
    category_text TEXT;
BEGIN

   SELECT rt.roles_is_personal_entry INTO is_personal
   FROM users_table ut 
   LEFT JOIN roles_table rt ON rt.roles_id = ut.roles_id
   WHERE ut.users_id = p_user_id;

   SELECT (translate(topic_category_identity, p_locale)).translation INTO category_text FROM topic_category_table
   WHERE topic_category_id = p_category_id;

   IF is_personal IS NULL OR category_text IS NULL THEN 
      RETURN jsonb_build_object(
        'is_public', false,
        'exists', NULL,
        'allowed', false,
        'category', null
      );
   ELSIF is_personal = TRUE THEN 
          check_public := COALESCE(p_public, FALSE);
   ELSE 
         check_public := TRUE;     
   END IF;

   -- Check if any value in the topics_identity JSONB matches p_name
   IF check_public = TRUE THEN 
        SELECT EXISTS (
            SELECT 1 FROM topics_table tt
            WHERE EXISTS (
                SELECT translation FROM translate(tt.topics_identity, p_locale)
                WHERE UNACCENT(LOWER(translation)) = UNACCENT(LOWER(p_name))
            )
            AND tt.topic_category_id = p_category_id
        ) INTO exists;
    ELSE 
        SELECT EXISTS (
            SELECT 1 FROM topics_table tt
            WHERE EXISTS (
                SELECT translation FROM translate(tt.topics_identity, p_locale)
                WHERE UNACCENT(LOWER(translation)) = UNACCENT(LOWER(p_name))
            )
            AND tt.topic_category_id = p_category_id
            AND (SELECT (translation::uuid) FROM translate(tt.topics_created_by, p_locale)) = p_user_id
        ) INTO exists;
     END IF;    

    RETURN jsonb_build_object(
        'is_public', check_public,
        'exists', exists,
        'allowed', true,
        'category', category_text
      );
END;
$function$

