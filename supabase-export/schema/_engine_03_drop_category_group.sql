-- Academix Engine — Migration 03: remove the category_group layer (topic_category is now the top).
-- PREREQUISITE (done): the 6 broader fns (fetch_categories, get_category_evaluation/exists,
-- submit_category/topic/question_content) were rewritten to drop all category_group references and
-- redeployed. After this migration nothing references category_group.
--
-- Quarantine, not hard-delete: the group-only FUNCTIONS are dropped from the DB but their definitions
-- remain in git history / _unused; the group TABLE (44 rows) is RENAMED to _unused_* (data preserved,
-- out of the active path), not dropped. The redundant category_group_id COLUMNS are dropped (topic_category_id
-- carries the hierarchy — verified 0 nulls).
--
-- ⚠ CO-DEPLOY: the live Flutter app still calls the group fns / passes p_group_id — see
-- academix-app/ENGINE_FLUTTER_TODO.md. (No live users, so backend goes first.)

-- 1. Drop the group-only functions.
DROP FUNCTION IF EXISTS public.evaluate_group(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.fetch_groups(text, text, text, text, uuid, text, integer, jsonb, text, integer);
DROP FUNCTION IF EXISTS public.get_group_evaluation(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.get_group_exists(text, uuid, boolean, text);
DROP FUNCTION IF EXISTS public.submit_group_content(text, text, text, text, jsonb[], jsonb[], jsonb[], jsonb[], uuid, boolean, text, uuid);

-- 2. Drop the redundant category_group_id columns (their FKs drop with the column).
ALTER TABLE public.topics_table         DROP COLUMN IF EXISTS category_group_id;
ALTER TABLE public.questions_table      DROP COLUMN IF EXISTS category_group_id;
ALTER TABLE public.topic_category_table DROP COLUMN IF EXISTS category_group_id;

-- 3. Quarantine the group table (preserve its rows; remove from the active schema).
ALTER TABLE IF EXISTS public.category_group_table RENAME TO _unused_category_group_table;
