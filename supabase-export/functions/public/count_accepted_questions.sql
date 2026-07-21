-- schema:   public
-- function: count_accepted_questions(p_user_id uuid, p_topic_id uuid, p_locale text, p_country text, p_age text, p_gender text, p_status text, p_visible boolean, p_tracker_status text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.count_accepted_questions(p_user_id uuid, p_topic_id uuid, p_locale text, p_country text, p_age text, p_gender text, p_status text DEFAULT 'Approval.approved'::text, p_visible boolean DEFAULT true, p_tracker_status text DEFAULT 'Question.completed'::text)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
    SELECT COUNT(*)::integer
    FROM get_accepted_questions(
        p_user_id, p_topic_id, p_locale, p_country, p_age, p_gender,
        p_status, p_visible, p_tracker_status
    );
$function$

