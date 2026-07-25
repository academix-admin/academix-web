'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/lib/stacks/user-stack';
import { fetchUserData } from '@/utils/checkers';
import { StateStack } from '@academix-admin/state-stack';
import type { UserData } from '@/models/user-data';

/**
 * OAuth callback. Supabase (implicit flow, detectSessionInUrl) parses the returned session
 * from the URL; we then decide where the user goes:
 *   - has an academix profile  → /main (this also covers email+password users whose Google
 *     identity Supabase auto-linked to the same user id — one person, one profile)
 *   - no profile yet           → /signup, where the Google session is picked up and the
 *     onboarding starts prefilled at step 2 (no email/password/email-OTP needed).
 */
export default function AuthCallback() {
  const router = useRouter();
  const search = useSearchParams();
  const { lang } = useLanguage();
  const { userData$ } = useUserData();
  const [message, setMessage] = useState('Signing you in…');
  const handled = useRef(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    const proceed = async (userId: string) => {
      if (handled.current) return;
      handled.current = true;
      try {
        const profile: UserData | null = await fetchUserData(userId, lang);
        if (profile) {
          await StateStack.core.clearScope('secondary_flow');
          await userData$.set(profile);
          const next = search.get('next');
          router.replace(next && next.startsWith('/') ? next : '/main');
        } else {
          // New social user → onboarding (signup flow detects the Google session).
          router.replace('/signup');
        }
      } catch (e) {
        console.error('OAuth callback error:', e);
        setMessage('Something went wrong. Redirecting…');
        router.replace('/login');
      }
    };

    const oauthError = search.get('error_description') || search.get('error');
    if (oauthError) {
      handled.current = true;
      router.replace('/login');
      return;
    }

    // Session may already be parsed, or arrive via the auth event a tick later.
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (data.session?.user) proceed(data.session.user.id);
    });

    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (session?.user) proceed(session.user.id);
    });
    unsub = () => sub.subscription.unsubscribe();

    // Fallback: if nothing resolved (no session in URL), bounce to login.
    const t = window.setTimeout(() => {
      if (!handled.current) {
        handled.current = true;
        router.replace('/login');
      }
    }, 8000);

    return () => {
      unsub?.();
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <span
          aria-hidden
          style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid #c4c4c4', borderTopColor: '#4f46e5',
            animation: 'ax-cb-spin 0.7s linear infinite',
          }}
        />
        <p style={{ color: 'var(--text-secondary, #6b7280)', margin: 0 }}>{message}</p>
      </div>
      <style>{`@keyframes ax-cb-spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
