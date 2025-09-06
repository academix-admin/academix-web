'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Session, User } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter"
import LoadingView from '@/components/LoadingView/LoadingView'
import { UserData } from '@/models/user-data';
import { useUserData } from '@/lib/stacks/user-stack';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

interface AuthContextType {
  initialized: boolean
  session: Session | null
  userData: UserData | null
}

const AuthContext = createContext<AuthContextType>({
  initialized: false,
  session: null,
  userData: null,
})

export function useAuthContext() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [initialized, setInitialized] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const { userData, userData$, __meta } = useUserData();
  const { replaceAndWait } = useAwaitableRouter()
  const { theme } = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current user and session separately
        const { data: { user: initialUser } } = await supabaseBrowser.auth.getUser()
        const { data: { session: initialSession } } = await supabaseBrowser.auth.getSession()
        setUser(initialUser);
        setSession(initialSession);

        const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
          async (event, newSession) => {
            setSession(newSession)
            setUser(newSession?.user ?? null)

            const publicRoutes = ['/', '/login', '/signup']
            const protectedRoutes = ['/main']

            if (!newSession && protectedRoutes.some(route => pathname.startsWith(route))) {
              setInitialized(false)
              await replaceAndWait("/")
            } else if (newSession && publicRoutes.includes(pathname) && userData) {
                console.log('Went to main')
              await replaceAndWait("/main")
            }

            setInitialized(true)
          }
        )

        return () => subscription.unsubscribe()
      } catch (error) {
        console.error('Auth initialization error:', error)
        setInitialized(true)
      }
    }

    if(__meta.isHydrated)initializeAuth();
  }, [router, pathname, replaceAndWait, __meta.isHydrated])

   if (!initialized) {
     return (
       <AuthContext.Provider value={{ initialized, session, userData }}>
         <LoadingView text={t('loading')} />
       </AuthContext.Provider>
     )
   }


  return (
    <AuthContext.Provider value={{ initialized, session, userData }}>
      {children}
    </AuthContext.Provider>
  )
}
