'use client';

/**
 * OAuth landing route.
 *
 * Normally does nothing: Supabase parses the returned session and the app-wide AuthProvider resolves
 * the profile and routes (profile → /main, new social user → /signup), under the one AuthBlocker.
 *
 * BUT when the sign-in is rejected server-side (the auth.sessions gate trigger raises — e.g. a blocked
 * region / disabled cohort for Google/OAuth), no session comes back and GoTrue returns an `error` in
 * the URL. We stash a reason so the login screen can show a clear message (AuthProvider then forwards
 * this no-session callback to /login).
 */
import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    try {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const query = new URLSearchParams(window.location.search);
      const err = hash.get('error') || query.get('error');
      if (!err) return;
      const desc = hash.get('error_description') || query.get('error_description') || '';
      const reason = /Region\.blocked/i.test(desc) ? 'region'
        : /AX_SIGNIN_GATE|Feature\.unavailable/i.test(desc) ? 'feature'
        : 'generic';
      sessionStorage.setItem('ax_auth_error', reason);
    } catch { /* ignore */ }
  }, []);
  return null;
}
