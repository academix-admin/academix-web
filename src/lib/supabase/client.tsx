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
  // Session real, but no academix profile yet (mid-onboarding). Same event as AX_APP_LOCKED —
  // the accountExists flag computed below (not a separate body/header field, see gateBodyFrom's
  // note) tells AppLock not to raise the PIN overlay for this one.
  AX_APP_LOCKED_NO_ACCOUNT: 'ax:app-locked',
};

// Pull the AX gate sentinel out of a PostgREST error body as the single-source BackendSessionGateError
// contract. Depending on PostgREST version a RAISE'd JSON arrives either at the top level (`{ code, ... }`)
// or nested under `message` as a JSON string.
//
// NOTE: account_exists is encoded directly in `code` (AX_APP_LOCKED vs AX_APP_LOCKED_NO_ACCOUNT),
// not a separate body field or response header. Both were tried and don't work: PostgREST's `raise
// sqlstate 'PGRST'` convention only ever extracts code/message/details/hint from the raised message
// JSON onto the response body, silently dropping any other key (verified live) — and a custom
// response header doesn't reach a browser either, since PostgREST's Access-Control-Expose-Headers is
// a fixed built-in list a custom header can't join (verified live: curl sees it, a real browser
// fetch() cannot). code/message are the two fields PostgREST reliably delivers, so that's what
// carries the signal.
function gateBodyFrom(body: unknown): BackendSessionGateError | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as Partial<BackendSessionGateError> & { message?: unknown };
  if (typeof b.code === 'string' && AX_GATE_EVENTS[b.code]) {
    return { code: b.code, message: typeof b.message === 'string' ? b.message : '' };
  }
  if (typeof b.message === 'string') {
    try {
      const inner = JSON.parse(b.message) as Partial<BackendSessionGateError>;
      if (typeof inner.code === 'string' && AX_GATE_EVENTS[inner.code]) {
        return { code: inner.code, message: inner.message ?? '' };
      }
    } catch { /* message isn't JSON */ }
  }
  return undefined;
}

// A non-sentinel 401 means our token was rejected. Confirm with an ACTUAL round-trip rather than
// checking the locally-cached session's expiry: this Supabase project issues effectively
// non-expiring JWTs (see AppLock's doc comment), so a session revoked SERVER-SIDE still looks
// locally "alive" forever — the old expires_at check could structurally never catch that case,
// which is why a genuinely-revoked session sometimes never triggered a redirect until a manual
// page refresh forced AuthProvider's own init check to run. session_touch is a lightweight
// authenticated RPC that no-ops if the session is fine and fails if it's been revoked/locked; if
// that failure carries a recognized AX_ gate code, gateFetch's own wrapping of this SAME call
// already dispatched the right event — only an unrecognized failure (network error, non-gate 401)
// falls through to the conservative "treat as revoked" default. Guarded so a burst of 401s
// triggers a single check.
let sessionRecheckInFlight = false;
async function revokeIfSessionDead() {
  if (sessionRecheckInFlight) return;
  sessionRecheckInFlight = true;
  try {
    const { error } = await supabaseBrowser.rpc('session_touch');
    if (error && !String((error as { code?: string }).code ?? '').startsWith('AX_')) {
      window.dispatchEvent(new CustomEvent(AX_GATE_EVENTS.AX_SESSION_REVOKED));
    }
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
        const accountExists = gate.code === 'AX_APP_LOCKED';
        window.dispatchEvent(new CustomEvent(AX_GATE_EVENTS[gate.code], { detail: { accountExists } }));
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
