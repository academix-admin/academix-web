// 'use client';

// import { createContext, useContext, useState, useEffect, useRef } from 'react';
// import { useRouter, usePathname } from 'next/navigation';
// import { Session, User } from '@supabase/supabase-js';
// import { supabaseBrowser } from '@/lib/supabase/client';
// import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";
// import AuthBlocker from '@/components/AuthBlocker/AuthBlocker';
// import { UserData } from '@/models/user-data';
// import { useUserData } from '@/lib/stacks/user-stack';
// import { StateStack } from '@academix-admin/state-stack';

// export type RoutePattern = string | RegExp;

// interface AuthContextType {
//   initialized: boolean;
//   session: Session | null;
//   userData: UserData | null;
//   hasValidSession: boolean;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export function useAuthContext() {
//   const context = useContext(AuthContext);
//   if (!context) throw new Error('useAuthContext must be used within an AuthProvider');
//   return context;
// }

// function matchesRoutePattern(
//   pathname: string,
//   patterns: RoutePattern[],
//   matchType: 'exact' | 'startsWith' | 'endsWith' = 'exact'
// ): boolean {
//   return patterns.some(pattern => {
//     if (typeof pattern === 'string') {
//       switch (matchType) {
//         case 'exact':     return pathname === pattern;
//         case 'startsWith': return pathname.startsWith(pattern);
//         case 'endsWith':  return pathname.endsWith(pattern);
//         default:          return pathname === pattern;
//       }
//     }
//     return pattern instanceof RegExp ? pattern.test(pathname) : false;
//   });
// }

// // Lifted out — no need to recreate on every render
// function isSessionExpired(sess: Session | null): boolean {
//   if (!sess) return true;
//   if (!sess.expires_at) return false;
//   const now = Math.floor(Date.now() / 1000);
//   const expired = now > sess.expires_at;
//   if (expired) console.log('[AUTH] Session expired', { expiresAt: sess.expires_at, now });
//   return expired;
// }

// const FLOW_SCOPES = [
//   'mission_flow', 'achievements_flow', 'payment_flow', 'secondary_flow',
//   'top-up-flow', 'withdraw-flow', 'roles-flow', 'redeem_code_flow',
// ] as const;

// async function clearAllScopes() {
//   await Promise.all(FLOW_SCOPES.map(s => StateStack.core.clearScope(s)));
//   sessionStorage.clear();
// }

// export function AuthProvider({ children }: { children: React.ReactNode }) {
//   const pathname = usePathname();
//   const [initialized, setInitialized] = useState(false);
//   const [session, setSession] = useState<Session | null>(null);
//   const [user, setUser] = useState<User | null>(null);
//   const { userData, __meta } = useUserData();
//   const { replaceAndWait } = useAwaitableRouter({ timeout: 8000, enableLogging: true });

//   const publicRoutes:   RoutePattern[] = ['/rules', '/payout', '/rewards', '/rates', '/about', '/help', '/instructions', /^\/redirect(\/[a-f0-9-]+)?$/];
//   const internalRoutes: RoutePattern[] = ['/', '/login', '/signup', '/welcome'];
//   const protectedRoutes: RoutePattern[] = ['/main', '/quiz', /^\/quiz\/[a-f0-9-]+$/];

//   // ─── Effect 1: auth init + subscription ───────────────────────────────────
//   // Runs once when hydrated. The subscription stays alive for the component's
//   // lifetime — never torn down by pathname or userData changes.
//   useEffect(() => {
//     const isPublicRoute = matchesRoutePattern(pathname, publicRoutes);

//     if (isPublicRoute) {
//       setInitialized(true);
//     }

//     if (!__meta.isHydrated || typeof window === 'undefined') return;

//     let mounted = true;

//     const initializeAuth = async () => {
//       try {
//         const [userResult, sessionResult] = await Promise.all([
//           supabaseBrowser.auth.getUser(),
//           supabaseBrowser.auth.getSession(),
//         ]);

//         if (!mounted) return;

//         const initialUser    = userResult.data.user;
//         const initialSession = sessionResult.data.session;

//         if (isSessionExpired(initialSession)) {
//           setUser(null);
//           setSession(null);
//         } else {
//           setUser(initialUser);
//           setSession(initialSession);
//         }

//         // ─── Subscription ─────────────────────────────────────────────────
//         const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
//           async (event, newSession) => {
//             if (!mounted) return;
//             console.log('[AUTH] onAuthStateChange', event);

//             if (!newSession || isSessionExpired(newSession)) {
//               setSession(null);
//               setUser(null);
//               await clearAllScopes();
//             } else {
//               setSession(newSession);
//               setUser(newSession.user ?? null);
//             }
//           }
//         );

//         if (mounted) setInitialized(true);

//         return () => subscription.unsubscribe();
//       } catch (error) {
//         console.error('[AUTH] Initialization error:', error);
//         if (mounted) setInitialized(true);
//       }
//     };

//     const cleanup = initializeAuth();

//     // ─── Tab visibility: re-validate session on return from idle ──────────
//     const handleVisibilityChange = async () => {
//       if (document.visibilityState !== 'visible') return;
//       const { data: { session: freshSession } } = await supabaseBrowser.auth.getSession();
//       if (!mounted) return;
//       if (isSessionExpired(freshSession)) {
//         setSession(null);
//         setUser(null);
//         await clearAllScopes();
//       } else {
//         setSession(freshSession);
//         setUser(freshSession?.user ?? null);
//       }
//     };

//     document.addEventListener('visibilitychange', handleVisibilityChange);

//     return () => {
//       mounted = false;
//       cleanup?.then(unsub => unsub?.());
//       document.removeEventListener('visibilitychange', handleVisibilityChange);
//     };
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [__meta.isHydrated]); // ← Only re-init if hydration state changes

//   // ─── Effect 2: redirect guard ─────────────────────────────────────────────
//   // Decoupled from subscription setup. Runs whenever route, session, or
//   // userData changes — the fast reactive path.
//   useEffect(() => {
//     if ( typeof window === 'undefined') return;

//     const hasSession = !!session && !isSessionExpired(session);

//     if (initialized && !__meta.isHydrated && hasSession && userData && matchesRoutePattern(pathname, internalRoutes)) {
//       replaceAndWait('/main');
//       return;
//     }

//     if (initialized && !hasSession && matchesRoutePattern(pathname, protectedRoutes)) {
//       replaceAndWait('/');
//     }
//   }, [initialized, session, __meta.isHydrated, userData, pathname]);

//   return (
//     <AuthContext.Provider value={{
//       initialized,
//       session,
//       userData,
//       hasValidSession: !!session && !isSessionExpired(session),
//     }}>
//       <AuthBlocker children={children} />
//     </AuthContext.Provider>
//   );
// }


'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Session, User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";
import AuthBlocker from '@/components/AuthBlocker/AuthBlocker';
import { UserData } from '@/models/user-data';
import { useUserData } from '@/lib/stacks/user-stack';
import { StateStack } from '@academix-admin/state-stack';
import { useLanguage } from '@/context/LanguageContext';
import { fetchUserData } from '@/utils/checkers';
import { useSignup } from '@/lib/stacks/signup-stack';
import { capitalizeWords } from '@/utils/textUtils';

export type RoutePattern = string | RegExp;

interface AuthContextType {
  initialized: boolean;
  /** true while we are resolving a signed-in user's academix profile (e.g. right after an
   *  OAuth sign-in, before we know whether to go to /main or onboarding). Keeps the single
   *  AuthBlocker loading up so there is never a second spinner. */
  resolving: boolean;
  /** the single "hold the loading" signal for AuthBlocker: not initialized, mid-resolve, or
   *  (on an auth route) the persisted StateStack not yet hydrated. The last one matters after
   *  an OAuth redirect — a COLD start where the home page's persisted data is still loading;
   *  waiting for hydration lets /main paint fully instead of flashing empty (email login is a
   *  warm client nav, so it's already hydrated and never waits here). Public routes never wait. */
  blocking: boolean;
  session: Session | null;
  userData: UserData | null;
  hasValidSession: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within an AuthProvider');
  return context;
}

function matchesRoutePattern(
  pathname: string,
  patterns: RoutePattern[],
  matchType: 'exact' | 'startsWith' | 'endsWith' = 'exact'
): boolean {
  return patterns.some(pattern => {
    if (typeof pattern === 'string') {
      switch (matchType) {
        case 'exact':      return pathname === pattern;
        case 'startsWith': return pathname.startsWith(pattern);
        case 'endsWith':   return pathname.endsWith(pattern);
        default:           return pathname === pattern;
      }
    }
    return pattern instanceof RegExp ? pattern.test(pathname) : false;
  });
}

function isSessionExpired(sess: Session | null): boolean {
  if (!sess) return true;
  if (!sess.expires_at) return false;
  const now = Math.floor(Date.now() / 1000);
  const expired = now > sess.expires_at;
  return expired;
}

const FLOW_SCOPES = [
  'mission_flow', 'achievements_flow', 'payment_flow', 'secondary_flow',
  'top-up-flow', 'withdraw-flow', 'roles-flow', 'redeem_code_flow',
  // D-security (2026-07-23): previously-missed user-data scopes — without
  // these, cached user data survived sign-out on shared devices.
  'give_back_flow', 'quiz-topics', 'pin_scope', 'payment-transactions',
  'pool_member_flow', 'quiz_pool_flow', 'active-quiz',
  // Onboarding progress must not survive a sign-out (else a fresh visitor could
  // inherit a stale social-onboarding marker).
  'signup_flow', 'login_flow',
] as const;

async function clearAllScopes() {
  await Promise.all(FLOW_SCOPES.map(s => StateStack.core.clearScope(s)));
  // Route-scoped state: useDemandState defaults to scope `route:<pathname>`
  // with persist: true, so persisted per-page data must be flushed too.
  await StateStack.clearByPrefix('route:');
  sessionStorage.clear();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [initialized, setInitialized] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const { userData, userData$, __meta } = useUserData();
  const { lang } = useLanguage();
  const { signup$ } = useSignup();
  const { replaceAndWait } = useAwaitableRouter({ timeout: 8000, enableLogging: true });
  const resolveRef = useRef(false);

  const publicRoutes:    RoutePattern[] = ['/rules', '/payout', '/rewards', '/rates', '/about', '/help', '/instructions', /^\/redirect(\/[a-f0-9-]+)?$/];
  // /auth/callback is where OAuth lands — treat it like an internal route so a signed-in
  // user with a profile is forwarded to /main once resolved.
  const internalRoutes:  RoutePattern[] = ['/', '/login', '/signup', '/welcome', '/auth/callback'];
  const protectedRoutes: RoutePattern[] = ['/main', '/quiz', /^\/quiz\/[a-f0-9-]+$/];

  // ─── Effect 1: auth init + subscription ───────────────────────────────────
  useEffect(() => {
    const isPublicRoute = matchesRoutePattern(pathname, publicRoutes);

    if (isPublicRoute) {
      setInitialized(true);
    }

    if (typeof window === 'undefined') return;

    let mounted = true;

    // Subscribe FIRST. onAuthStateChange emits INITIAL_SESSION from local storage with NO
    // network round-trip, so `initialized` flips fast even on a poor/offline connection; later
    // TOKEN_REFRESHED / SIGNED_OUT events keep it in sync (e.g. a background token refresh
    // after the tab was idle for hours). Previously we AWAITED a network getUser() here, which
    // hung indefinitely on a poor network after backgrounding and froze the AuthBlocker loader.
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        if (!newSession || isSessionExpired(newSession)) {
          resolveRef.current = false;
          setSession(null);
          setUser(null);
          // Only wipe cached scopes on a REAL sign-out — a transient/expired blip must not
          // clear userData (which would bounce a still-valid user to the landing page).
          if (event === 'SIGNED_OUT') await clearAllScopes();
        } else {
          setSession(newSession);
          setUser(newSession.user ?? null);
        }
        if (mounted) setInitialized(true);
      }
    );

    // Backstop: never let a slow/offline auth check freeze the app on the loader.
    const initFloor = window.setTimeout(() => { if (mounted) setInitialized(true); }, 3500);

    // ─── Tab visibility: refresh session state on return from idle (never blocks the loader).
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { data: { session: freshSession } } = await supabaseBrowser.auth.getSession();
        if (!mounted) return;
        const valid = freshSession && !isSessionExpired(freshSession);
        setSession(valid ? freshSession : null);
        setUser(valid ? (freshSession!.user ?? null) : null);
      } catch {
        /* offline — leave state as-is; the auth subscription will catch up on reconnect */
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.clearTimeout(initFloor);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ─── Server-side revocation: another device / "log out" killed this session ───
  // The Supabase session gate (db_pre_request) refuses this device's requests with AX_SESSION_REVOKED;
  // the client fetch interceptor broadcasts `ax:session-revoked`. Sign out so the redirect guard sends
  // this device to /login — immediately, instead of the JWT lingering valid for up to its 60-min TTL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // scope: 'local' — the session is ALREADY revoked server-side, so a global (server) signOut would
    // just hang on the dead session and never fire SIGNED_OUT (so no redirect). Clearing locally is
    // instant and triggers the redirect guard.
    const onRevoked = () => { supabaseBrowser.auth.signOut({ scope: 'local' }).catch(() => { /* already gone */ }); };
    window.addEventListener('ax:session-revoked', onRevoked);
    return () => window.removeEventListener('ax:session-revoked', onRevoked);
  }, []);

  // ─── Effect 1b: profile resolution (the single place OAuth is handled) ────
  // A signed-in user without loaded academix `userData` (the classic case: right after a
  // Google/OAuth sign-in — Supabase gives us a session but no profile in state) is resolved
  // HERE, under the one AuthBlocker loading, so there is never a second spinner or a route
  // race with a per-page callback:
  //   • profile found  → set userData (Effect 2 forwards internal routes → /main)
  //   • no profile yet → prefill the signup stack from the session + go to /signup, where
  //     step 1 auto-advances to step 2 (onboarding). Covers merged email+Google users too
  //     (same user id → profile found → /main).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!initialized || !__meta.isHydrated) return;

    const hasSession = !!session && !isSessionExpired(session);
    if (!hasSession || userData || resolveRef.current) return;
    if (matchesRoutePattern(pathname, publicRoutes)) return; // don't disrupt public browsing

    resolveRef.current = true;
    setResolving(true);
    (async () => {
      try {
        // Timeout the fetch so a poor network can't leave the loader (resolving) stuck; on
        // timeout we throw → reset resolveRef so it retries on the next auth/route change.
        const profile = await Promise.race([
          fetchUserData(session!.user.id, lang),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('profile-resolve-timeout')), 10000)),
        ]);
        if (profile) {
          // Stale onboarding marker (from an abandoned social sign-up) must not linger.
          await StateStack.core.clearScope('signup_flow');
          await userData$.set(profile);
          // Effect 2 will forward internal/callback routes → /main.
        } else {
          const u = session!.user;
          const provider = (u.app_metadata?.provider as string) || '';
          // Only a social (OAuth) session with no profile means "needs onboarding".
          if (provider && provider !== 'email' && provider !== 'phone') {
            const meta = u.user_metadata ?? {};
            const name = meta.full_name || meta.name || '';
            signup$.setField(
              { field: 'provider', value: provider },
              { field: 'authUserId', value: u.id },
              { field: 'fullName', value: name ? capitalizeWords(name) : '' },
              { field: 'email', value: u.email || '' },
            );
            if (pathname !== '/signup') await replaceAndWait('/signup');
          }
          // A password (email/phone) session with no profile yet is the normal login RACE:
          // login.tsx owns email/phone post-login navigation and is about to set userData +
          // go to /main. We must NOT bounce to /login here — the user is authenticated, and
          // redirecting them races login.tsx, producing the "logged in, then back to login"
          // flash. If the profile is genuinely missing, Effect 2 keeps them put (no session →
          // no forward) and the login screen's own error handling covers a failed sign-in.
        }
      } catch (e) {
        console.error('[AUTH] profile resolution error:', e);
        resolveRef.current = false;
      } finally {
        setResolving(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, session, userData, __meta.isHydrated, pathname]);

  // ─── Effect 2: redirect guard ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasSession = !!session && !isSessionExpired(session);

    // Redirect to /main: needs full confidence — initialized, hydrated, session, and userData
    if (initialized && __meta.isHydrated && hasSession && userData && matchesRoutePattern(pathname, internalRoutes)) {
      replaceAndWait('/main');
      return;
    }

    // Redirect to /: session definitively gone — hydration state is irrelevant here
    if (initialized && !hasSession && matchesRoutePattern(pathname, protectedRoutes)) {
      replaceAndWait('/');
      return;
    }

    // /auth/callback with no session = a bare/expired hit (real OAuth always arrives with a
    // session in the URL). Nothing to resolve → send them to /login.
    if (initialized && !resolving && !hasSession && pathname === '/auth/callback') {
      replaceAndWait('/login');
      return;
    }
  }, [initialized, resolving, session, __meta.isHydrated, userData, pathname]);

  // Single "hold the loading" signal. Deliberately does NOT gate on `__meta.isHydrated`:
  // that flag can flip on token-refresh / app-resume re-hydration, which made the AuthBlocker
  // flash the loader at intervals mid-session. The cold-start empty-home is handled where it
  // belongs — each tab page reveals its sections together (useSettledReveal) — so we only hold
  // the loader while auth itself is settling (init + OAuth profile resolution).
  //
  // Only PROTECTED routes wait on `initialized` (we must know the session before showing
  // protected content). Public + internal routes — the landing `/`, /login, /signup, /welcome,
  // marketing pages — render immediately with NO auth wait; a signed-in visitor is forwarded to
  // /main reactively by Effect 2 once the session resolves. This kills the "long loading" the
  // landing page showed while auth initialized. `resolving` still holds the loader during an
  // OAuth profile resolution (on /auth/callback or a logged-in landing) regardless of route.
  const onProtectedRoute = matchesRoutePattern(pathname, protectedRoutes);
  const blocking = (onProtectedRoute && !initialized) || resolving;

  return (
    <AuthContext.Provider value={{
      initialized,
      resolving,
      blocking,
      session,
      userData,
      hasValidSession: !!session && !isSessionExpired(session),
    }}>
      <AuthBlocker children={children} />
    </AuthContext.Provider>
  );
}