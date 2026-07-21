-- schema:   public
-- function: get_pool_question_options(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid, p_question_id uuid, p_question_type text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_pool_question_options(p_country text, p_locale text, p_gender text, p_age text, p_user_id uuid, p_question_id uuid, p_question_type text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
        RETURN QUERY SELECT 
        jsonb_build_object(
            'options_id', ot.options_id,
            'options_image',ot.options_image,
            'options_identity',(SELECT * FROM preserve_option_identity((SELECT translation FROM translate(ot.options_identity,p_locale)), p_question_type)),
            'options_min', ot.options_min,
            'options_max', ot.options_max,
            'options_unit', ot.options_unit,
            'options_selected', EXISTS (
                SELECT 1 FROM option_tracker_table ott
                LEFT JOIN question_tracker_table qtt ON qtt.question_tracker_id = ott.question_tracker_id
                LEFT JOIN pools_question_table pqt ON pqt.pools_question_id = qtt.pools_question_id
                LEFT JOIN pools_table pt ON pt.pools_id = pqt.pools_id
                WHERE pqt.questions_id = p_question_id
                AND ott.options_id = ot.options_id
                AND pools_status = 'Pools.active'
                AND qtt.users_id = p_user_id
            )
        )
        FROM options_table ot 
        LEFT JOIN questions_table qt ON ot.questions_id = qt.questions_id
        WHERE ot.questions_id = p_question_id;

END;
$function$

