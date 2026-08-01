-- Academix Engine — Migration 04: server-authoritative role security for authoring.
-- Academix_Engine_plan §2.4. The submit_*_content RPCs now call assert_can_contribute(p_user_id,
-- visibility) at the top (see functions/public/assert_can_contribute.sql + the submit mirrors), which
-- checks the ACTING user's role: creator+ (roles_level >= 2) to author, roles_is_personal_entry for
-- private. A non-service caller acts as auth.uid() (never a spoofed p_user_id), so a student/anon cannot
-- contribute by calling the RPC directly. Defense-in-depth: revoke anon from the submit RPCs entirely
-- (anon should never author). Idempotent.
REVOKE EXECUTE ON FUNCTION public.submit_category_content(text,text,text,text,jsonb[],jsonb[],jsonb[],jsonb[],uuid,uuid,boolean,text,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_topic_content(text,text,text,text,jsonb[],jsonb[],jsonb[],jsonb[],uuid,uuid,boolean,text,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_question_content(text,text,text,text,jsonb[],jsonb[],jsonb[],jsonb[],uuid,uuid,uuid,uuid,boolean,text,jsonb[],uuid) FROM anon;
