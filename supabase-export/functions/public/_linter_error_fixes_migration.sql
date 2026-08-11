-- =====================================================================================
-- Supabase database-linter ERROR fixes (2026-08-11).
--
-- 1) public.newsletter_table — RLS disabled on a PostgREST-exposed table.
--    anon could SELECT *and* INSERT it directly. That is subscriber contact data readable by
--    anyone holding the public anon key, which is published in every web bundle. Verified no client
--    touches the table directly — the only caller is change_newsletter_subscription(), which is
--    SECURITY DEFINER and therefore unaffected by RLS. So we can close direct access outright.
--
-- 2) public.fraud_analytics — SECURITY DEFINER view.
--    It aggregates fraud_logs per user (risk scores, blocked counts, device/IP counts) and was
--    SELECTable by anon and authenticated. A definer view ignores the querying user's RLS, so any
--    key holder could read fraud analytics for EVERY user — both a privacy leak and a gift to an
--    attacker probing which behaviour trips our fraud scoring. Verified fraud_logs is only queried
--    from the server-side /api/fraud-check route (service_role), so nothing legitimate breaks.
-- =====================================================================================

-- ── 1. newsletter_table ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.newsletter_table ENABLE ROW LEVEL SECURITY;   -- no policies: no direct access

-- Belt and braces, same reasoning as security_audit_log: Supabase grants on public tables mean RLS
-- would otherwise be the only barrier, and a future policy added carelessly would re-open it.
REVOKE ALL ON TABLE public.newsletter_table FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.newsletter_table IS
  'Newsletter subscribers. No direct client access: RLS on with no policies AND grants revoked. '
  'Write via public.change_newsletter_subscription() (SECURITY DEFINER) only.';

-- ── 2. fraud_analytics ──────────────────────────────────────────────────────────────────────────
-- security_invoker makes the view run with the QUERYING user's permissions/RLS rather than the
-- creator's, which is what the linter asks for and what we want for anything fraud-related.
ALTER VIEW public.fraud_analytics SET (security_invoker = true);

-- It is an internal analytics surface; clients have no business reading it at all.
REVOKE ALL ON public.fraud_analytics FROM PUBLIC, anon, authenticated;

COMMENT ON VIEW public.fraud_analytics IS
  'Internal fraud analytics over fraud_logs. security_invoker=true; no client grants. '
  'Read via service_role (server-side /api/fraud-check) only.';

-- ── 3. SECURITY DEFINER functions with a mutable search_path ────────────────────────────────────
-- Of the ~197 functions the linter flags for a mutable search_path, only these three are SECURITY
-- DEFINER — and that combination is the one that actually escalates privilege, because the function
-- runs with the OWNER's rights, so anyone who can influence name resolution inherits them. The
-- remaining ~194 run as the caller, so a hijacked path only lets a caller affect themselves; they
-- are queued (Part VI, Q28) rather than bulk-altered here, since several are money functions and a
-- 194-function change is not something to make minutes before a test pass.
--
-- `public` first preserves how unqualified names resolve today; `extensions` is required because
-- Supabase keeps gen_random_uuid() and friends there.
ALTER FUNCTION public.change_creator_follow_status(uuid, uuid)     SET search_path = public, extensions;
ALTER FUNCTION public.change_newsletter_subscription(text)         SET search_path = public, extensions;
ALTER FUNCTION public.change_topic_personalised_status(uuid, uuid) SET search_path = public, extensions;

-- Ours, from _security_audit_log_migration.sql. It only RAISEs, so it needs no user schema at all.
ALTER FUNCTION public.security_audit_log_immutable()               SET search_path = pg_catalog;
