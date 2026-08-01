-- schema:   public
-- function: get_role_dashboard(p_locale)
-- Per-role contribution dashboard stats. Server-authoritative: the caller's identity is derived from the
-- JWT via gate_check (NEVER client-sent, per Academix_Engine_plan §2.5). Authorship/review is read from the
-- *_created_by / *_reviewed_by jsonb (the user's uuid appears as a value, in any language key); approval is
-- the canonical Approval.* enum. Capability flags mirror get_user_record / assert_can_contribute (§2.6).

CREATE OR REPLACE FUNCTION public.get_role_dashboard(p_locale text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id            uuid;
  v_level              int;
  v_checker            text;
  v_can_contribute     boolean;
  v_can_create_private boolean;
  v_can_review         boolean;
  v_cats               int := 0;
  v_topics             int := 0;
  v_questions          int := 0;
  v_pending            int := 0;
  v_approved           int := 0;
  v_review_queue       int := 0;
  v_reviewed           int := 0;
BEGIN
  -- [gate] server-authoritative identity (never client-sent), via gate_check.
  SELECT users_id INTO v_user_id FROM public.gate_check(NULL, p_locale);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '28000';
  END IF;

  SELECT rt.roles_level,
         rt.roles_checker,
         COALESCE(rt.roles_level >= 2, false),
         COALESCE(rt.roles_is_personal_entry, false),
         COALESCE(rt.roles_checker IN ('Roles.reviewer', 'Roles.academix_reviewer'), false)
    INTO v_level, v_checker, v_can_contribute, v_can_create_private, v_can_review
  FROM users_table ut
  JOIN roles_table rt ON rt.roles_id = ut.roles_id
  WHERE ut.users_id = v_user_id;

  -- authored counts (my uuid is a value in the *_created_by jsonb, any language key)
  SELECT COUNT(*) INTO v_cats FROM topic_category_table t
    WHERE EXISTS (SELECT 1 FROM jsonb_each_text(t.topic_category_created_by) je WHERE je.value = v_user_id::text);
  SELECT COUNT(*) INTO v_topics FROM topics_table t
    WHERE EXISTS (SELECT 1 FROM jsonb_each_text(t.topics_created_by) je WHERE je.value = v_user_id::text);
  SELECT COUNT(*) INTO v_questions FROM questions_table t
    WHERE EXISTS (SELECT 1 FROM jsonb_each_text(t.questions_created_by) je WHERE je.value = v_user_id::text);

  -- pending / approved across my authored content (approval is a canonical Approval.* enum)
  SELECT
    COUNT(*) FILTER (WHERE approv IN ('Approval.open', 'Approval.reserved', 'Approval.evaluate')),
    COUNT(*) FILTER (WHERE approv = 'Approval.approved')
  INTO v_pending, v_approved
  FROM (
    SELECT (SELECT je.value FROM jsonb_each_text(t.approval_status) je LIMIT 1) AS approv
      FROM topic_category_table t
      WHERE EXISTS (SELECT 1 FROM jsonb_each_text(t.topic_category_created_by) je WHERE je.value = v_user_id::text)
    UNION ALL
    SELECT (SELECT je.value FROM jsonb_each_text(t.approval_status) je LIMIT 1)
      FROM topics_table t
      WHERE EXISTS (SELECT 1 FROM jsonb_each_text(t.topics_created_by) je WHERE je.value = v_user_id::text)
    UNION ALL
    SELECT (SELECT je.value FROM jsonb_each_text(t.approval_status) je LIMIT 1)
      FROM questions_table t
      WHERE EXISTS (SELECT 1 FROM jsonb_each_text(t.questions_created_by) je WHERE je.value = v_user_id::text)
  ) mine;

  -- reviewer stats: queue = content awaiting review I did NOT author; reviewed = content I reviewed
  IF v_can_review THEN
    SELECT
      COUNT(*) FILTER (WHERE approv IN ('Approval.open', 'Approval.reserved', 'Approval.evaluate') AND NOT mine),
      COUNT(*) FILTER (WHERE reviewed_me)
    INTO v_review_queue, v_reviewed
    FROM (
      SELECT
        (SELECT je.value FROM jsonb_each_text(t.approval_status) je LIMIT 1) AS approv,
        EXISTS (SELECT 1 FROM jsonb_each_text(t.topic_category_created_by) je WHERE je.value = v_user_id::text) AS mine,
        EXISTS (SELECT 1 FROM jsonb_each_text(t.topic_category_reviewed_by) je WHERE je.value = v_user_id::text) AS reviewed_me
        FROM topic_category_table t
      UNION ALL
      SELECT
        (SELECT je.value FROM jsonb_each_text(t.approval_status) je LIMIT 1),
        EXISTS (SELECT 1 FROM jsonb_each_text(t.topics_created_by) je WHERE je.value = v_user_id::text),
        EXISTS (SELECT 1 FROM jsonb_each_text(t.topics_reviewed_by) je WHERE je.value = v_user_id::text)
        FROM topics_table t
      UNION ALL
      SELECT
        (SELECT je.value FROM jsonb_each_text(t.approval_status) je LIMIT 1),
        EXISTS (SELECT 1 FROM jsonb_each_text(t.questions_created_by) je WHERE je.value = v_user_id::text),
        EXISTS (SELECT 1 FROM jsonb_each_text(t.questions_reviewed_by) je WHERE je.value = v_user_id::text)
        FROM questions_table t
    ) allc;
  END IF;

  RETURN jsonb_build_object(
    'roles_level',              v_level,
    'roles_checker',            v_checker,
    'roles_can_contribute',     v_can_contribute,
    'roles_can_create_private', v_can_create_private,
    'roles_can_review',         v_can_review,
    'categories_authored',      v_cats,
    'topics_authored',          v_topics,
    'questions_authored',       v_questions,
    'content_authored',         v_cats + v_topics + v_questions,
    'pending_approval',         v_pending,
    'approved',                 v_approved,
    'review_queue',             v_review_queue,
    'reviewed',                 v_reviewed
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_role_dashboard(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_role_dashboard(text) TO authenticated, service_role;
