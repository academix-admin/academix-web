-- =====================================================================================
-- Pin search_path on every remaining function (Supabase linter 0011,
-- function_search_path_mutable). ACADEMIX_PLAN Part VI, Q28.
--
-- WHY IT MATTERS
-- A function without a fixed search_path resolves unqualified names using the CALLER's path. Anyone
-- who can get a same-named object earlier in that path makes the function call their object
-- instead. For SECURITY DEFINER functions that is privilege escalation (those three were pinned
-- first, in _linter_error_fixes_migration.sql); for the rest it is still a correctness and
-- integrity hazard on functions that move money.
--
-- WHY THIS IS SAFE TO APPLY IN BULK
-- `public, extensions, personal` is a SUPERSET of what these functions resolve with today. The
-- effective default is `"$user", public` (roles anon/authenticated carry no search_path of their
-- own; only `postgres` adds extensions), and no schema is named after those roles, so today's
-- effective path is essentially just `public`.
--   * `public` stays FIRST, so every name that resolves today resolves to exactly the same object.
--   * `extensions` and `personal` are appended, so they can only rescue lookups that would
--     currently FAIL — turning an error into a success, never changing a success into something else.
-- Nothing is added ahead of public, which is what would have allowed shadowing.
--
-- Applied as ONE transaction: if any single ALTER fails, the whole thing rolls back rather than
-- leaving the database half-pinned.
--
-- Bodies are NOT touched — only the function's search_path setting.
-- =====================================================================================

DO $migration$
DECLARE
  r          record;
  v_count    integer := 0;
  v_skipped  text[]  := '{}';
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,
           p.proname AS fn_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'personal')
      AND p.proconfig IS NULL     -- only those with no setting at all; never override an explicit one
      AND p.prokind = 'f'         -- plain functions; aggregates/window funcs cannot take SET
      -- Skip objects owned by an installed EXTENSION (unaccent, pg_trgm, …). They are not our code,
      -- we are not their owner so ALTER is refused, and upgrading the extension would revert us
      -- anyway. Their search_path is the extension author's concern, not ours.
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = public, extensions, personal',
        r.schema_name, r.fn_name, r.args
      );
      v_count := v_count + 1;
    EXCEPTION WHEN insufficient_privilege THEN
      -- Recorded, not swallowed: anything landing here is a function we do not own, and the NOTICE
      -- below names it so it can be dealt with deliberately instead of disappearing.
      v_skipped := v_skipped || format('%s.%s(%s)', r.schema_name, r.fn_name, r.args);
    END;
  END LOOP;

  RAISE NOTICE 'pinned search_path on % functions', v_count;
  IF array_length(v_skipped, 1) > 0 THEN
    RAISE NOTICE 'skipped (not owner): %', array_to_string(v_skipped, ', ');
  END IF;
END
$migration$;
