// 'use client';

// import { createContext, useContext, useState, useEffect, useRef } from 'react';
// import { useRouter, usePathname } from 'next/navigation';
// import { Session, User } from '@supabase/supabase-js';
// import { supabaseBrowser } from '@/lib/supabase/client';
// import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";
// import AuthBlocker from '@/components/AuthBlocker/AuthBlocker';
// import { UserData } from '@/models/user-data';
// import { useUserData } from '@/lib/stacks/user-stack';
// import { StateStack } from '@/lib/state-stack';

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
import { StateStack } from '@/lib/state-stack';

export type RoutePattern = string | RegExp;

interface AuthContextType {
  initialized: boolean;
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
] as const;

async function clearAllScopes() {
  await Promise.all(FLOW_SCOPES.map(s => StateStack.core.clearScope(s)));
  sessionStorage.clear();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const { userData, __meta } = useUserData();
  const { replaceAndWait } = useAwaitableRouter({ timeout: 8000, enableLogging: true });

  const publicRoutes:    RoutePattern[] = ['/rules', '/payout', '/rewards', '/rates', '/about', '/help', '/instructions', /^\/redirect(\/[a-f0-9-]+)?$/];
  const internalRoutes:  RoutePattern[] = ['/', '/login', '/signup', '/welcome'];
  const protectedRoutes: RoutePattern[] = ['/main', '/quiz', /^\/quiz\/[a-f0-9-]+$/];

  // ─── Effect 1: auth init + subscription ───────────────────────────────────
  useEffect(() => {
    const isPublicRoute = matchesRoutePattern(pathname, publicRoutes);

    if (isPublicRoute) {
      setInitialized(true);
    }

    if (typeof window === 'undefined') return;

    let mounted = true;

    const initializeAuth = async () => {
      try {
        const [userResult, sessionResult] = await Promise.all([
          supabaseBrowser.auth.getUser(),
          supabaseBrowser.auth.getSession(),
        ]);

        if (!mounted) return;

        const initialUser    = userResult.data.user;
        const initialSession = sessionResult.data.session;

        if (isSessionExpired(initialSession)) {
          setUser(null);
          setSession(null);
        } else {
          setUser(initialUser);
          setSession(initialSession);
        }

        // ─── Subscription ──────────────────────────────────────────────
        const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!mounted) return;

            if (!newSession || isSessionExpired(newSession)) {
              setSession(null);
              setUser(null);
              await clearAllScopes();
            } else {
              setSession(newSession);
              setUser(newSession.user ?? null);
            }
          }
        );

        if (mounted) {
          setInitialized(true);
        }

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('[AUTH Effect1] initialization error=' + error);
        if (mounted) setInitialized(true);
      }
    };

    const cleanup = initializeAuth();

    // ─── Tab visibility: re-validate session on return from idle ──────
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      const { data: { session: freshSession } } = await supabaseBrowser.auth.getSession();
      if (!mounted) return;
      if (isSessionExpired(freshSession)) {
        setSession(null);
        setUser(null);
        await clearAllScopes();
      } else {
        setSession(freshSession);
        setUser(freshSession?.user ?? null);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      cleanup?.then(unsub => unsub?.());
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
  }, [initialized, session, __meta.isHydrated, userData, pathname]);

  return (
    <AuthContext.Provider value={{
      initialized,
      session,
      userData,
      hasValidSession: !!session && !isSessionExpired(session),
    }}>
      <AuthBlocker children={children} />
    </AuthContext.Provider>
  );
}