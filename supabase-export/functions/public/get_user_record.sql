-- schema:   public
-- function: get_user_record(p_user_id uuid, p_locale text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_user_record(p_user_id uuid, p_locale text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'users_id',              ut.users_id,
        'users_names',           ut.users_names,
        'users_username',        ut.users_username,
        'users_phone',           ut.users_phone,
        'users_email',           ut.users_email,
        'users_image',           ut.users_image,
        'users_dob',             ut.users_dob,
        'users_sex',             ut.users_sex,
        'users_verified',        (SELECT * FROM public.fetch_user_activation_status(ut.users_id)),
        'language_table',        jsonb_build_object(
            'language_id',           lt.language_id,
            'language_identity',     (SELECT translation FROM translate(lt.language_identity, p_locale)),
            'language_code',         lt.language_code
        ),
        'country_table',         jsonb_build_object(
            'country_id',            ct.country_id,
            'country_identity',      (SELECT translation FROM translate(ct.country_identity, p_locale)),
            'country_image',         ct.country_image,
            'country_two_iso_code',  ct.country_two_iso_code
        ),
        'users_created_at',      ut.users_created_at,
        'transaction_id',        ut.transaction_id,
        'users_roles_access',    ut.users_roles_access,
        'users_referred_details', (
            SELECT jsonb_build_object(
                'users_referred_id',     urt.users_id,
                'users_referred_status', ut.users_referred_status,
                'users_names',           urt.users_names,
                'users_username',        urt.users_username,
                'users_image',           urt.users_image
            )
            FROM users_table urt
            WHERE urt.users_id = ut.users_referred_id
        ),
        'roles_table',           jsonb_build_object(
            'roles_id',              rt.roles_id,
            'roles_level',           rt.roles_level,
            'roles_checker',         rt.roles_checker
        )
    )
    INTO result
    FROM       users_table   ut
    LEFT JOIN  roles_table   rt ON rt.roles_id   = ut.roles_id
    LEFT JOIN  country_table ct ON ct.country_id = ut.country_id
    LEFT JOIN  language_table lt ON lt.language_id = ut.language_id
    WHERE ut.users_id = p_user_id;

    RETURN result;
END;
$function$

