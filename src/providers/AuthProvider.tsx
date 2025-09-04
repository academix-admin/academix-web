'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Session, User } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter"
import LoadingView from '@/components/LoadingView/LoadingView'

interface AuthContextType {
  initialized: boolean
  session: Session | null
  user: User | null
}

const AuthContext = createContext<AuthContextType>({
  initialized: false,
  session: null,
  user: null,
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
  const { replaceAndWait } = useAwaitableRouter()

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current user and session separately
        const { data: { user: initialUser } } = await supabaseBrowser.auth.getUser()
        const { data: { session: initialSession } } = await supabaseBrowser.auth.getSession()
        setUser(initialUser)
        setSession(initialSession)

        const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
          async (event, newSession) => {
            setSession(newSession)
            setUser(newSession?.user ?? null)

            const publicRoutes = ['/', '/login', '/signup']
            const protectedRoutes = ['/main', '/dashboard']

            if (!newSession && protectedRoutes.some(route => pathname.startsWith(route))) {
              setInitialized(false)
              await replaceAndWait("/")
            } else if (newSession && publicRoutes.includes(pathname)) {
              setInitialized(false)
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

    initializeAuth()
  }, [router, pathname, replaceAndWait])

  if (!initialized) {
    return (
      <body>
        <AuthContext.Provider value={{ initialized, session, user }}>
            <LoadingView />
        </AuthContext.Provider>
      </body>
    )
  }

  return (
    <AuthContext.Provider value={{ initialized, session, user }}>
      {children}
    </AuthContext.Provider>
  )
}
