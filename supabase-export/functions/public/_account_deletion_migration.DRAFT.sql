-- =====================================================================================
-- DRAFT — NOT DEPLOYED. Requires legal (DPO/counsel) sign-off AND a DBA review before use.
--
-- Account deletion with AML retention.
--
-- THE TENSION THIS RESOLVES
-- Two obligations point in opposite directions:
--   * Right to erasure (NDPA 2023 / GDPR Art.17) — the user may demand their personal data be
--     deleted.
--   * AML/CFT record-keeping — a regulated money business MUST retain customer identification and
--     transaction records for a statutory period after the relationship ends.
-- Both are satisfied by ERASING everything not legally required and RETAINING only the minimum,
-- under the "legal obligation" lawful basis rather than consent. Retention is not an exception to
-- erasure; it is a narrower, documented carve-out with an expiry.
--
-- DELIBERATE DESIGN CHOICES
--   * Financial transactions are NEVER deleted. They are the AML record. They are PSEUDONYMISED by
--     repointing at deleted_profile_id, so the ledger stays intact and auditable while ceasing to be
--     directly identifying.
--   * A GRACE PERIOD before anything is destroyed. Deletion is irreversible and is a favourite tool
--     of account takeovers — an attacker who gets in should not be able to erase the victim's
--     evidence. Sessions are revoked immediately, but data survives until the grace window closes.
--   * retain_until is COMPUTED AND STORED per row, not derived at read time, so a later policy change
--     cannot retroactively extend or shorten a retention already promised to a user.
--   * A purge job is REQUIRED. Retention without a purge is just indefinite storage, which is itself
--     a violation. The `purged_at` column exists so "we actually deleted it" is provable.
--
-- ⚠ RETENTION PERIOD IS A LEGAL INPUT, NOT AN ENGINEERING ONE.
-- The placeholder below is 5 years, which is the common AML baseline in both Nigeria and the EU.
-- It MUST be confirmed by counsel for every jurisdiction served before this ships, and it may
-- differ per jurisdiction once Academix operates outside Nigeria (see ACADEMIX_PLAN Part VII).
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.deleted_profiles (
  deleted_profile_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Intentionally NOT a foreign key: the users_table row is gone by the time this matters.
  users_id               uuid NOT NULL,
  deletion_reason        text NOT NULL,              -- user_request | admin_action | fraud | duplicate
  legal_basis            text NOT NULL DEFAULT 'aml_record_keeping',
  requested_at           timestamptz NOT NULL DEFAULT now(),
  -- Null until the grace period closes and erasure actually runs.
  completed_at           timestamptz,
  -- Frozen at request time. See "deliberate design choices" above.
  retain_until           date NOT NULL,
  -- The MINIMUM identity set AML requires. Everything else about the user is erased at source.
  -- Keep this as narrow as counsel allows — every extra field is a liability, not a safety net.
  retained_identity      jsonb NOT NULL,
  -- Who acted, when the deletion was not user-initiated.
  actioned_by            uuid,
  -- Proof the retention actually ended. Set by the purge job.
  purged_at              timestamptz
);

ALTER TABLE public.deleted_profiles ENABLE ROW LEVEL SECURITY;  -- no policies: service_role only
CREATE INDEX IF NOT EXISTS deleted_profiles_users_idx      ON public.deleted_profiles(users_id);
CREATE INDEX IF NOT EXISTS deleted_profiles_retain_idx     ON public.deleted_profiles(retain_until)
  WHERE purged_at IS NULL;   -- the purge job's working set

COMMENT ON TABLE public.deleted_profiles IS
  'AML retention store for deleted accounts. Holds the minimum identity set required by law, with a '
  'per-row expiry. Purged by a scheduled job once retain_until passes.';

-- ── Statutory retention window (single source of truth, like session_idle_window()) ──────────────
-- Changing this affects only NEW deletions: existing rows carry their own frozen retain_until.
CREATE OR REPLACE FUNCTION public.account_retention_window()
RETURNS interval LANGUAGE sql IMMUTABLE AS $$ SELECT interval '5 years' $$;

-- ── Step 1: the user asks. Nothing is destroyed yet. ─────────────────────────────────────────────
-- Revokes every session immediately (so the account stops being usable, and a takeover cannot keep
-- operating it), records the request, and starts the grace clock.
CREATE OR REPLACE FUNCTION public.request_account_deletion(p_reason text DEFAULT 'user_request')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'auth', 'public'
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING errcode = '42501';
  END IF;

  -- Idempotent: a second request must not create a second retention row or restart the clock.
  SELECT deleted_profile_id INTO v_id
    FROM public.deleted_profiles WHERE users_id = v_uid AND completed_at IS NULL;
  IF FOUND THEN RETURN v_id; END IF;

  INSERT INTO public.deleted_profiles (users_id, deletion_reason, retain_until, retained_identity)
  VALUES (
    v_uid,
    p_reason,
    (now() + public.account_retention_window())::date,
    -- TODO(legal): confirm this field set with counsel before deployment. Narrower is better.
    (SELECT jsonb_build_object(
              'users_id',    u.users_id,
              'email',       u.users_email,
              'phone',       u.users_phone,
              'full_name',   u.users_names,
              'created_at',  u.users_created_at
            )
       FROM public.users_table u WHERE u.users_id = v_uid)
  )
  RETURNING deleted_profile_id INTO v_id;

  -- Stop the account being usable right now: drop every session (the gate refuses them instantly).
  DELETE FROM auth.sessions WHERE user_id = v_uid;

  RETURN v_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.request_account_deletion(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(text) TO authenticated;

-- ── Step 2 (scheduled, service_role): erase after the grace period ───────────────────────────────
-- Deliberately NOT written yet. It is the destructive half and must not be drafted casually:
-- it needs an explicit, reviewed inventory of every table holding personal data, a decision per
-- table (erase / anonymise / retain), and a dry-run mode that reports what it WOULD touch.
-- Financial tables are pseudonymised (repoint to deleted_profile_id), never deleted.

-- ── Step 3 (scheduled, service_role): purge once retain_until passes ─────────────────────────────
-- Also deliberately not written yet — same reason. Must set purged_at so expiry is provable.
