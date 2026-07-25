/**
 * Swappable public base URL for auth redirects.
 *
 * Order: NEXT_PUBLIC_SITE_URL (set this to https://academix.com when the domain goes
 * live) → the current browser origin (works on academix-web.vercel.app today and on any
 * preview deploy) → a hardcoded prod fallback for SSR when neither is available.
 *
 * One env var flips every OAuth redirect to the new domain — no code change.
 */
const PROD_FALLBACK = 'https://academix-web.vercel.app';

export function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return PROD_FALLBACK;
}

/** Absolute URL for the OAuth callback (optionally carrying a post-login `next` path). */
export function authRedirectUrl(next?: string): string {
  const base = `${getSiteUrl()}/auth/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}
