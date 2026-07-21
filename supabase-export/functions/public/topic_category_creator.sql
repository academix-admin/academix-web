-- schema:   public
-- function: topic_category_creator(topic_category_table)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.topic_category_creator(topic_category_table)
 RETURNS SETOF users_table
 LANGUAGE sql
 ROWS 1
AS $function$
    select u
    from "users_table" u
    where $1.users_creator_id = u."users_id"
    limit 1
$function$

