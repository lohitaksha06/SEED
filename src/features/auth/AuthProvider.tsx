import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"
import { AuthContext, type AuthContextValue } from "@/features/auth/auth-context"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error(error)
      }

      if (isMounted) {
        setSession(data.session)
        setIsLoading(false)
      }
    }

    loadSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        setSession(nextSession)
        setIsLoading(false)
      },
    )

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return error?.message ?? null
      },
      signUp: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password })
        return error?.message ?? null
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut()
        return error?.message ?? null
      },
    }),
    [isLoading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
