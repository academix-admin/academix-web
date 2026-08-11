-- =====================================================================================
-- Security audit log (ACADEMIX_PLAN Part VI, Q10 — OWASP A09).
--
-- WHY
-- There is currently no durable, queryable record of security-relevant events: sign-ins, new
-- devices, session revocations, PIN failures and lockouts, money movements. Three consequences:
--   * Incidents cannot be reconstructed. Today's app-lock bugs took hours partly because "it failed"
--     could not be traced to anything.
--   * Several regulatory expectations (breach detection and notification, incident reporting under
--     NDPA/CBN guidance) assume such a record exists.
--   * Detection is impossible: nobody can alert on "50 failed PINs for one user" if failures are
--     not written down.
--
-- DESIGN
--   * APPEND-ONLY. No UPDATE/DELETE grants to anyone, including service_role, and a trigger that
--     rejects both. An audit log an attacker (or a careless migration) can rewrite is not evidence.
--   * NO SECRETS OR PII BEYOND IDENTIFIERS. Never log a PIN, token, password or full pan. `detail`
--     is jsonb for context (attempts_left, device name, amount) — reviewed per call site, because
--     an audit log is exactly the table most likely to be over-shared with support staff later.
--   * WRITTEN BY service_role ONLY, via log_security_event(). Clients must never write their own
--     audit trail — it would be trivially forgeable.
--   * READ BY NOBODY by default. RLS is on with no policies, so even authenticated users cannot
--     read it. Staff access comes later through a reviewed admin surface, not a blanket grant.
--   * Retention is a POLICY DECISION (Part VI Q20 / Part VII §2). This migration does not purge;
--     it records `occurred_at` so a purge job can be added once the period is agreed.
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  audit_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  -- Dot-namespaced, e.g. auth.sign_in / auth.sign_out / session.revoked / pin.failed /
  -- pin.locked_out / applock.unlocked / payment.created / account.deletion_requested.
  event_type    text        NOT NULL,
  -- Nullable: some events (a failed sign-in for an unknown identifier) have no user yet.
  users_id      uuid,
  session_id    uuid,
  -- 'app' | 'web' | 'lambda' | 'system'
  source        text        NOT NULL DEFAULT 'system',
  ip            text,
  user_agent    text,
  -- Structured context. NEVER secrets. See the design note above.
  detail        jsonb       NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;  -- no policies: readable by nobody

-- Defence in depth. RLS-with-no-policies already hides every row, but Supabase grants SELECT on
-- public tables to anon/authenticated by default, so that would be the ONLY thing standing between
-- clients and the audit trail. Revoke the table privilege too: if someone later adds a policy
-- carelessly, the grant must not be sitting there waiting to matter.
REVOKE ALL ON TABLE public.security_audit_log FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS security_audit_log_user_time_idx  ON public.security_audit_log(users_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS security_audit_log_type_time_idx  ON public.security_audit_log(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS security_audit_log_time_idx       ON public.security_audit_log(occurred_at DESC);

COMMENT ON TABLE public.security_audit_log IS
  'Append-only record of security-relevant events (OWASP A09). Written only via '
  'log_security_event() as service_role. Never store secrets or credentials here.';

-- ── Append-only enforcement ─────────────────────────────────────────────────────────────────────
-- Grants alone are not enough: service_role bypasses RLS and would otherwise be able to rewrite
-- history. The trigger makes tampering fail loudly regardless of who attempts it.
CREATE OR REPLACE FUNCTION public.security_audit_log_immutable()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'security_audit_log is append-only (attempted %)', TG_OP
    USING errcode = '42501';
END;
$fn$;

DROP TRIGGER IF EXISTS security_audit_log_no_update ON public.security_audit_log;
CREATE TRIGGER security_audit_log_no_update
  BEFORE UPDATE OR DELETE ON public.security_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.security_audit_log_immutable();

-- ── The only writer ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_users_id   uuid    DEFAULT NULL,
  p_session_id uuid    DEFAULT NULL,
  p_source     text    DEFAULT 'system',
  p_ip         text    DEFAULT NULL,
  p_user_agent text    DEFAULT NULL,
  p_detail     jsonb   DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  INSERT INTO public.security_audit_log
    (event_type, users_id, session_id, source, ip, user_agent, detail)
  VALUES
    (p_event_type, p_users_id, p_session_id, coalesce(p_source,'system'), p_ip, p_user_agent,
     coalesce(p_detail, '{}'::jsonb));
EXCEPTION WHEN OTHERS THEN
  -- Logging must NEVER break the operation it is observing. A failure to record a sign-in must not
  -- prevent the sign-in. Swallow deliberately; a missing row is far cheaper than a blocked user.
  RETURN;
END;
$fn$;

REVOKE ALL ON FUNCTION public.log_security_event(text, uuid, uuid, text, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, uuid, uuid, text, text, text, jsonb)
  TO service_role;

-- ── Detection helper ────────────────────────────────────────────────────────────────────────────
-- Recent failure/revocation counts per user, for alerting. A log nobody queries is just storage.
CREATE OR REPLACE FUNCTION public.security_event_counts(p_since interval DEFAULT interval '1 hour')
RETURNS TABLE(event_type text, users_id uuid, occurrences bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT event_type, users_id, count(*) AS occurrences
  FROM public.security_audit_log
  WHERE occurred_at >= now() - p_since
  GROUP BY event_type, users_id
  HAVING count(*) > 1
  ORDER BY count(*) DESC;
$fn$;

REVOKE ALL ON FUNCTION public.security_event_counts(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_event_counts(interval) TO service_role;
