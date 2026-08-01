-- Academix Engine — Migration 01: private-authoring capability for every role above student.
-- DECISION (Academix_Engine_plan §1): every role level >= 2 (creator included) can hold PRIVATE
-- (personal) content, not just reviewer+. Student (level 1) still cannot contribute at all.
-- Idempotent + reversible (data-only; no drops).
UPDATE public.roles_table
   SET roles_is_personal_entry = true
 WHERE roles_level >= 2
   AND roles_is_personal_entry IS DISTINCT FROM true;
