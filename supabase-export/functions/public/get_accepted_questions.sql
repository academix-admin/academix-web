-- schema:   public
-- function: get_accepted_questions(p_user_id uuid, p_topic_id uuid, p_locale text, p_country text, p_age text, p_gender text, p_status text, p_visible boolean, p_tracker_status text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.get_accepted_questions(p_user_id uuid, p_topic_id uuid, p_locale text, p_country text, p_age text, p_gender text, p_status text DEFAULT 'Approval.approved'::text, p_visible boolean DEFAULT true, p_tracker_status text DEFAULT 'Question.completed'::text)
 RETURNS SETOF questions_table
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN QUERY
    SELECT qt.*
    FROM questions_table qt
 
    -- Materialize all translate()/decontrol() calls once per row
    -- using LATERAL. Each fires exactly once regardless of how many
    -- conditions reference the result.
    CROSS JOIN LATERAL (
        SELECT translation AS identity_translation
        FROM translate(qt.questions_identity, p_locale)
    ) tr_identity
    CROSS JOIN LATERAL (
        SELECT translation::uuid AS creator_id
        FROM translate(qt.questions_created_by, p_locale)
    ) tr_creator
    CROSS JOIN LATERAL (
        SELECT translation::uuid AS reviewer_id
        FROM translate(qt.questions_reviewed_by, p_locale)
    ) tr_reviewer
    CROSS JOIN LATERAL (
        SELECT translation AS status_translation
        FROM translate(qt.approval_status, p_locale)
    ) tr_status
    CROSS JOIN LATERAL (
        SELECT value AS lang_ok
        FROM decontrol(qt.language_control, p_locale, p_locale)
    ) dc_lang
    CROSS JOIN LATERAL (
        SELECT value AS country_ok
        FROM decontrol(qt.country_control, p_country, p_locale)
    ) dc_country
    CROSS JOIN LATERAL (
        SELECT value AS gender_ok
        FROM decontrol(qt.gender_control, p_gender, p_locale)
    ) dc_gender
    CROSS JOIN LATERAL (
        SELECT value AS age_ok
        FROM decontrol(qt.age_control, p_age, p_locale)
    ) dc_age
 
    WHERE
        -- Index-friendly filter first — eliminates most rows before
        -- the lateral joins even execute for those rows.
        qt.topics_id       = p_topic_id
        AND qt.questions_visible = p_visible
 
        -- Now filter on the pre-materialized values
        AND tr_identity.identity_translation IS NOT NULL
        AND tr_creator.creator_id  <> p_user_id
        AND tr_reviewer.reviewer_id <> p_user_id
        AND dc_lang.lang_ok       = true
        AND dc_country.country_ok = true
        AND dc_gender.gender_ok   = true
        AND dc_age.age_ok         = true
        AND tr_status.status_translation = p_status
 
        -- Tracker exclusion: user has not already completed this question
        AND NOT EXISTS (
            SELECT 1
            FROM question_tracker_table qtt
            JOIN pools_question_table pqt
                ON pqt.pools_question_id = qtt.pools_question_id
            WHERE pqt.questions_id                          = qt.questions_id
              AND qtt.users_id                              = p_user_id
              AND qtt.question_tracker_question_status      = p_tracker_status
        );
END;
$function$

