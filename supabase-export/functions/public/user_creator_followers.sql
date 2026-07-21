-- schema:   public
-- function: user_creator_followers(users_table)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.user_creator_followers(users_table)
 RETURNS SETOF users_followers_table
 LANGUAGE sql
AS $function$
    select uf
    from "users_followers_table" uf
    where $1.users_id = uf."users_creator_id"
$function$

