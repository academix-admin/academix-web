import { createClient } from '@supabase/supabase-js';
import type { BackendSessionGateError } from '@academix-admin/domain-types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Global session-gate interceptor.
 *
 * The Supabase db_pre_request (`public.enforce_session`) refuses a revoked or locked session with a
 * sentinel body — `{ code: 'AX_SESSION_REVOKED' }` (401) or `{ code: 'AX_APP_LOCKED' }` (423). We
 * detect it ONCE here and broadcast a window event so AuthProvider (sign out) and AppLock (re-lock)
 * can react — no per-call-site handling. Deleting the client overlay can't help: the request itself
 * already failed server-side. Only 401/423 responses are inspected, so normal traffic is untouched.
 *
 * Also handles the "returned after a long background" case: a plain 401 that ISN'T the gate sentinel
 * means the JWT/session was rejected (expired/invalid/refresh-token gone). We confirm via a refresh and,
 * if the session can't be revived, force re-auth — otherwise the app looked "logged in" while every
 * request 401'd and it never left for /login.
 */
const AX_GATE_EVENTS: Record<string, string> = {
  AX_SESSION_REVOKED: 'ax:session-revoked',
  AX_APP_LOCKED: 'ax:app-locked',
};

// Pull the AX gate sentinel out of a PostgREST error body as the single-source BackendSessionGateError
// contract. Depending on PostgREST version a RAISE'd JSON arrives either at the top level (`{ code, ... }`)
// or nested under `message` as a JSON string.
function gateBodyFrom(body: unknown): BackendSessionGateError | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as Partial<BackendSessionGateError> & { message?: unknown };
  if (typeof b.code === 'string' && AX_GATE_EVENTS[b.code]) {
    return { code: b.code, message: typeof b.message === 'string' ? b.message : '', account_exists: b.account_exists === true };
  }
  if (typeof b.message === 'string') {
    try {
      const inner = JSON.parse(b.message) as Partial<BackendSessionGateError>;
      if (typeof inner.code === 'string' && AX_GATE_EVENTS[inner.code]) {
        return { code: inner.code, message: inner.message ?? '', account_exists: inner.account_exists === true };
      }
    } catch { /* message isn't JSON */ }
  }
  return undefined;
}

// A non-sentinel 401 means our token was rejected. Distinguish a refreshable blip (proactive refresh
// races) from a truly dead session: force a refresh; only if there's still no live session do we treat
// it as revoked. Guarded so a burst of 401s triggers a single check.
let sessionRecheckInFlight = false;
async function revokeIfSessionDead() {
  if (sessionRecheckInFlight) return;
  sessionRecheckInFlight = true;
  try {
    const { data, error } = await supabaseBrowser.auth.getSession();
    const s = data?.session;
    const alive = !error && !!s && (!s.expires_at || s.expires_at * 1000 > Date.now() + 5000);
    if (!alive) window.dispatchEvent(new CustomEvent(AX_GATE_EVENTS.AX_SESSION_REVOKED));
  } catch {
    window.dispatchEvent(new CustomEvent(AX_GATE_EVENTS.AX_SESSION_REVOKED));
  } finally {
    sessionRecheckInFlight = false;
  }
}

const gateFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  if ((res.status === 401 || res.status === 423) && typeof window !== 'undefined') {
    let handled = false;
    try {
      const gate = gateBodyFrom(await res.clone().json());
      if (gate) {
        window.dispatchEvent(new CustomEvent(AX_GATE_EVENTS[gate.code], { detail: { accountExists: gate.account_exists } }));
        handled = true;
      }
    } catch {
      /* non-JSON body — fall through */
    }
    // Not the gate sentinel, but a 401 = token rejected. 423 without a sentinel is left alone (it's an
    // app-lock signal we don't recognise, not an auth failure).
    if (!handled && res.status === 401) void revokeIfSessionDead();
  }
  return res;
};

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: gateFetch },
});
