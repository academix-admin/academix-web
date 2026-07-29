import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Global session-gate interceptor.
 *
 * The Supabase db_pre_request (`public.enforce_session`) refuses a revoked or locked session with a
 * sentinel body — `{ code: 'AX_SESSION_REVOKED' }` (401) or `{ code: 'AX_APP_LOCKED' }` (423). We
 * detect it ONCE here and broadcast a window event so AuthProvider (sign out) and AppLock (re-lock)
 * can react — no per-call-site handling. Deleting the client overlay can't help: the request itself
 * already failed server-side. Only 401/423 bodies are inspected, so normal traffic is untouched.
 */
const AX_GATE_EVENTS: Record<string, string> = {
  AX_SESSION_REVOKED: 'ax:session-revoked',
  AX_APP_LOCKED: 'ax:app-locked',
};

const gateFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  if ((res.status === 401 || res.status === 423) && typeof window !== 'undefined') {
    try {
      const body = await res.clone().json();
      const evt = body?.code && AX_GATE_EVENTS[body.code as string];
      if (evt) window.dispatchEvent(new CustomEvent(evt));
    } catch {
      /* not a gate response — ignore */
    }
  }
  return res;
};

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: gateFetch },
});
