-- schema:   public
-- function: handle_new_user()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pgcrypto', 'public'
AS $function$begin
  insert into public.users_table (
  users_id,
  users_email,
  users_phone,
  users_dob,
  users_sex,
  users_username,
  users_names,
  users_login_type,
  country_id,
  language_id,
  roles_id,
  users_referred_id,
  users_referred_status
  )
  values (
  new.id,
  new.raw_user_meta_data->>'users_email',
  new.raw_user_meta_data->>'users_phone',
  new.raw_user_meta_data->>'users_dob',
  new.raw_user_meta_data->>'users_sex',
  new.raw_user_meta_data->>'users_username',
  new.raw_user_meta_data->>'users_names',
  new.raw_user_meta_data->>'users_login_type',
  (new.raw_user_meta_data->>'country_id')::text::uuid,
  (new.raw_user_meta_data->>'language_id')::text::uuid,
  (new.raw_user_meta_data->>'roles_id')::text::uuid,
  (new.raw_user_meta_data->>'users_referred_id')::text::uuid,
  CASE WHEN (new.raw_user_meta_data->>'users_referred_id')::text IS NOT NULL
       THEN 'Referral.active'::text
       ELSE 'Referral.none'::text
  END
  );

  insert into personal.users_login_pin_table (
     users_id,
     users_login_pin_value
  )values(
     new.id,
     new.raw_user_meta_data->>'users_pin'
  );

  insert into personal.users_balance_table (
  users_id)values(
     new.id
  );

  insert into public.users_settings_table (
  users_id)values(
     new.id
  );

  update auth.users set raw_user_meta_data = null
  where auth.users.id = new.id;


  return new;
end;$function$

