-- schema:   personal
-- function: verify_login_pin(users_login_pin_value text, users_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION personal.verify_login_pin(users_login_pin_value text, users_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$declare 
  verified_user JSONB;
  pin_text text;
Begin
  -- select personal.users_login_pin_table.users_login_pin_value into pin_text from personal.users_login_pin_table where personal.users_login_pin_table.users_id = verify_login_pin.users_id;

-- pin_text = verify_login_pin.users_login_pin_value
  if true then 
    SELECT * INTO verified_user FROM get_user_record(users_id);
  else 
     verified_user := NULL;   
  end if;   

  return verified_user;
end;$function$

