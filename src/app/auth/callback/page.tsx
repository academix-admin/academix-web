'use client';

/**
 * OAuth landing route.
 *
 * Intentionally does nothing itself: Supabase parses the returned session, and the app-wide
 * AuthProvider (the single source of truth) resolves the profile and routes — profile →
 * /main, new social user → /signup onboarding — all under the one AuthBlocker loading. This
 * page just needs to exist as an allow-listed redirect target; AuthBlocker covers the screen
 * while resolution happens, so there is no second spinner.
 */
export default function AuthCallback() {
  return null;
}
