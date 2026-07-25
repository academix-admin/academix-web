'use client';

import React, { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { authRedirectUrl } from '@/lib/site-url';
import styles from './SocialAuthButtons.module.css';

/**
 * SocialAuthButtons — OAuth sign-in/up entry points (Supabase `signInWithOAuth`).
 *
 * Provider-extensible: add facebook/github/apple to PROVIDERS + the `providers` prop and
 * they render with no other change. The redirect base is env-swappable via
 * `authRedirectUrl` (vercel today, academix.com later). One button component shared by
 * /login and /signup so both stay in sync.
 */

export type OAuthProvider = 'google' | 'facebook' | 'github' | 'apple';

interface ProviderMeta {
  label: string;
  supabase: 'google' | 'facebook' | 'github' | 'apple';
  icon: React.ReactNode;
  /** provider-specific auth query params. */
  queryParams?: Record<string, string>;
}

const PROVIDERS: Record<OAuthProvider, ProviderMeta> = {
  google: {
    label: 'Continue with Google',
    supabase: 'google',
    icon: <GoogleIcon />,
    // select_account: always let the user pick which Google account.
    queryParams: { prompt: 'select_account' },
  },
  facebook: { label: 'Continue with Facebook', supabase: 'facebook', icon: null },
  github: { label: 'Continue with GitHub', supabase: 'github', icon: null },
  apple: { label: 'Continue with Apple', supabase: 'apple', icon: null },
};

export interface SocialAuthButtonsProps {
  /** which providers to show (default: just google). */
  providers?: OAuthProvider[];
  /** where to land after onboarding/sign-in completes (passed through the callback). */
  next?: string;
  /** theme for the built-in default styles. */
  theme?: 'light' | 'dark';
  disabled?: boolean;
  /** called if starting the OAuth redirect throws (before we leave the page). */
  onError?: (message: string) => void;
  classNames?: { root?: string; button?: string };
}

export function SocialAuthButtons({
  providers = ['google'],
  next,
  theme,
  disabled,
  onError,
  classNames = {},
}: SocialAuthButtonsProps) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);

  const start = async (p: OAuthProvider) => {
    if (pending) return;
    setPending(p);
    try {
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: PROVIDERS[p].supabase,
        options: {
          redirectTo: authRedirectUrl(next),
          queryParams: PROVIDERS[p].queryParams,
        },
      });
      if (error) throw error;
      // On success the browser navigates away to the provider; nothing else to do.
    } catch (e) {
      setPending(null);
      onError?.(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
    }
  };

  const rootClass = [classNames.root, styles.root, theme === 'dark' ? styles.dark : styles.light]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      {providers.map((p) => (
        <button
          key={p}
          type="button"
          className={classNames.button ?? styles.button}
          onClick={() => start(p)}
          disabled={disabled || !!pending}
          aria-busy={pending === p}
        >
          {pending === p ? <span className={styles.spinner} aria-hidden /> : PROVIDERS[p].icon}
          <span>{PROVIDERS[p].label}</span>
        </button>
      ))}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
