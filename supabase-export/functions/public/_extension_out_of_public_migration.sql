-- =====================================================================================
-- Move the `unaccent` extension out of the public schema (Supabase linter 0014,
-- extension_in_public). ACADEMIX_PLAN Part VI, Q34.
--
-- WHY IT MATTERS
-- An extension in `public` puts its functions in the same namespace application code writes
-- to, so a table or function added later can collide with or shadow an extension symbol, and
-- the extension's objects inherit public's grants.
--
-- WHY THIS IS SAFE HERE
--   * Exactly three functions reference unaccent: get_category_exists, get_question_exists,
--     get_topic_exists. All three already carry `SET search_path = public, extensions,
--     personal` (pinned in _pin_function_search_path_migration.sql), so an unqualified
--     unaccent() call still resolves once the extension lives in `extensions`.
--   * Zero index, view and materialised-view dependencies (checked via pg_get_indexdef,
--     pg_views and pg_matviews). Index expressions are the usual reason a relocation breaks
--     search, and there are none.
--   * Stored references are by OID, so existing objects follow the extension automatically.
-- =====================================================================================

CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

ALTER EXTENSION unaccent SET SCHEMA extensions;
