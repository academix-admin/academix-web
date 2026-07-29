-- ============================================================================
-- Server-side session gate (Workstream G — full-API enforcement)
--
-- Purpose:
--  * Device revocation is IMMEDIATE across the whole PostgREST API. Deleting the
--    auth.sessions row (revoke_my_session / signOut others) previously only killed
--    the refresh token; the 60-min access JWT kept working. Now every request checks
--    the JWT's session_id against auth.sessions and is refused the instant it's gone.
--  * App-lock is SERVER-ENFORCED. After an idle window a session is "locked": every
--    request is refused until the money PIN is re-verified (which extends the window).
--    Deleting the client overlay in devtools does nothing — the operations fail server-side.
--
-- Design: a single db_pre_request function runs before every PostgREST request. It is
-- FAIL-OPEN — it only refuses when it can prove the session is revoked or locked; any
-- unexpected shape (anon, no session_id, service_role, missing claims) is allowed through.
-- ============================================================================

-- Per-session app-lock state. Only SECURITY DEFINER functions touch it (RLS on, no policies).
create table if not exists public.session_locks (
  session_id     uuid primary key,
  user_id        uuid not null,
  unlocked_until timestamptz not null,
  updated_at     timestamptz not null default now()
);
alter table public.session_locks enable row level security;
create index if not exists session_locks_user_idx on public.session_locks(user_id);

-- Idle window before a session locks (single source of truth for the whole gate).
create or replace function public.session_idle_window()
returns interval language sql immutable as $$ select interval '15 minutes' $$;

-- Testable status: returns NULL when the request is allowed, or a reason code.
-- Never raises — safe to call directly. enforce_session() (the pre-request) wraps it.
create or replace function public.session_gate_status()
returns text
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  v_claims json := nullif(current_setting('request.jwt.claims', true), '')::json;
  v_role   text := v_claims ->> 'role';
  v_sid    uuid := nullif(v_claims ->> 'session_id', '')::uuid;
  v_created        timestamptz;
  v_unlocked_until timestamptz;
begin
  -- Fail-open: only gate genuine authenticated end-user requests that carry a session id.
  if v_role is distinct from 'authenticated' or v_sid is null then
    return null;
  end if;

  -- Revocation — the session row is gone: this JWT belongs to a logged-out device.
  select s.created_at into v_created from auth.sessions s where s.id = v_sid;
  if not found then
    return 'session_revoked';
  end if;

  -- App-lock — a fresh session is implicitly unlocked for one idle window from creation;
  -- a PIN unlock (session_locks row) overrides that with a rolling window.
  select sl.unlocked_until into v_unlocked_until
    from public.session_locks sl where sl.session_id = v_sid;
  if v_unlocked_until is null then
    v_unlocked_until := v_created + public.session_idle_window();
  end if;
  if now() > v_unlocked_until then
    return 'app_locked';
  end if;

  return null;
end;
$$;

revoke all on function public.session_gate_status() from public;
grant execute on function public.session_gate_status() to anon, authenticated, service_role;

-- ============================================================================
-- Session gate — part 2: heartbeat, unlock authority, and the pre-request wrapper.
-- ============================================================================

-- Heartbeat: called by the client on genuine user activity (throttled). Slides the
-- idle window forward, but ONLY for a session that is currently allowed — it can never
-- unlock a locked/revoked session (so it can't be used to bypass the app-lock).
create or replace function public.session_touch()
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  v_sid uuid := nullif(current_setting('request.jwt.claims', true)::json ->> 'session_id', '')::uuid;
  v_uid uuid := auth.uid();
begin
  if v_sid is null or v_uid is null then return; end if;
  if public.session_gate_status() is not null then return; end if; -- locked/revoked: no-op
  insert into public.session_locks(session_id, user_id, unlocked_until, updated_at)
    values (v_sid, v_uid, now() + public.session_idle_window(), now())
    on conflict(session_id) do update set unlocked_until = excluded.unlocked_until, updated_at = now();
end;
$$;
revoke all on function public.session_touch() from public, anon;
grant execute on function public.session_touch() to authenticated;

-- Unlock authority: ONLY the PIN-verify Lambda (service_role) may call this, AFTER it has
-- verified the money PIN (or determined the account is PIN-less). Opens/extends the window.
-- Never exposed to end users — otherwise the app-lock could be self-unlocked without a PIN.
create or replace function public.session_unlock(p_session_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' and session_user <> 'service_role' then
    raise exception 'session_unlock: forbidden';
  end if;
  insert into public.session_locks(session_id, user_id, unlocked_until, updated_at)
    values (p_session_id, p_user_id, now() + public.session_idle_window(), now())
    on conflict(session_id) do update set unlocked_until = excluded.unlocked_until, updated_at = now();
end;
$$;
revoke all on function public.session_unlock(uuid, uuid) from public, anon, authenticated;
grant execute on function public.session_unlock(uuid, uuid) to service_role;

-- Pre-request: runs before EVERY PostgREST request (set via db_pre_request). Fail-open —
-- any internal error allows the request. Currently enforces REVOCATION only; app-lock
-- (app_locked) is deferred until the Lambda calls session_unlock (see ENABLE_APP_LOCK below).
create or replace function public.enforce_session()
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  v_status text;
  ENABLE_APP_LOCK constant boolean := false; -- flip to true once PIN-verify Lambda calls session_unlock
begin
  begin
    v_status := public.session_gate_status();
  exception when others then
    return; -- fail-open: never let a gate bug break the whole API
  end;

  if v_status = 'session_revoked'
     or (ENABLE_APP_LOCK and v_status = 'app_locked') then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'AX_' || upper(v_status),
        'message', case when v_status = 'session_revoked' then 'Session revoked' else 'App locked' end
      )::text,
      detail = json_build_object(
        'status', case when v_status = 'session_revoked' then 401 else 423 end,
        'headers', json_build_object()
      )::text;
  end if;
end;
$$;
revoke all on function public.enforce_session() from public;
grant execute on function public.enforce_session() to anon, authenticated, service_role;

-- ── Activation (applied live) ──────────────────────────────────────────────
-- Wire the pre-request so it runs before every PostgREST request:
alter role authenticator set pgrst.db_pre_request = 'public.enforce_session';
notify pgrst, 'reload config';
-- Rollback: alter role authenticator reset pgrst.db_pre_request; notify pgrst,'reload config';
-- App-lock stays OFF (enforce_session ENABLE_APP_LOCK=false) until verify_academix_pin +
-- supabase_flutter_authorizer are deployed; then re-create enforce_session with the flag true.
