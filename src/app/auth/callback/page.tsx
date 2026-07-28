'use client';

/**
 * OAuth landing route.
 *
 * Normally does nothing: Supabase parses the returned session and the app-wide AuthProvider resolves
 * the profile and routes (profile → /main, new social user → /signup), under the one AuthBlocker.
 *
 * When the sign-in is rejected server-side (the auth.sessions gate trigger raises — e.g. a blocked
 * region / disabled cohort for Google/OAuth), no session comes back and AuthProvider forwards this
 * route to /login. We drop a marker so /login re-checks the gate (via cf-ipcountry) and shows a clear
 * message — the raw reason doesn't survive GoTrue/supabase-js, so the login screen resolves it itself.
 */
import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    try { sessionStorage.setItem('ax_auth_check', '1'); } catch { /* ignore */ }
  }, []);
  return null;
}
