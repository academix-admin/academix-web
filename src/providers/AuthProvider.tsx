'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Session, User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";
import LoadingView from '@/components/LoadingView/LoadingView';
import AuthBlocker from '@/components/AuthBlocker/AuthBlocker';
import { UserData } from '@/models/user-data';
import { useUserData } from '@/lib/stacks/user-stack';
import { StateStack } from '@/lib/state-stack';

interface AuthContextType {
  initialized: boolean;
  session: Session | null;
  userData: UserData | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within an AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const { userData, __meta } = useUserData();
  const { replaceAndWait } = useAwaitableRouter();

  const publicRoutes = ['/', '/login', '/signup', '/welcome'];
  const protectedRoutes = ['/main', '/quiz'];

  useEffect(() => {
    if (!__meta.isHydrated) return;

    let unsubscribe: (() => void) | undefined;

    const initializeAuth = async () => {
      try {
        const [{ data: { user: initialUser } }, { data: { session: initialSession } }] = await Promise.all([
          supabaseBrowser.auth.getUser(),
          supabaseBrowser.auth.getSession(),
        ]);

        setUser(initialUser);
        setSession(initialSession);

        if (initialUser && userData && publicRoutes.includes(pathname)) {
          console.log('Redirecting authenticated user to main');
          await replaceAndWait("/main");
        }

        const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
          async (event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);

            if (!newSession) {
              await Promise.all([
                StateStack.core.clearScope('mission_flow'),
                StateStack.core.clearScope('achievements_flow'),
                StateStack.core.clearScope('payment_flow'),
                StateStack.core.clearScope('secondary_flow'),
              ]);
              sessionStorage.clear();
              if (protectedRoutes.some(route => pathname.startsWith(route))) {
                console.log('Returning to home');
                await replaceAndWait("/");
              }
            }

            setInitialized(true);
          }
        );

        unsubscribe = () => subscription.unsubscribe();
        setInitialized(true);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setInitialized(true);
      }
    };

    initializeAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [__meta.isHydrated]);


  return (
    <AuthContext.Provider value={{ initialized, session, userData }}>
      <AuthBlocker children={children}/>
    </AuthContext.Provider>
  );
}
