import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, hasSupabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasSupabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async ({ email, password }) => {
    if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signUp = async ({ email, password, username }) => {
    if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
  }

  const signOut = async () => {
    if (!hasSupabase) return
    await supabase.auth.signOut()
  }

  const resetPassword = async ({ email }) => {
    if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
  }

  const updatePassword = async ({ password }) => {
    if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
    return supabase.auth.updateUser({ password })
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
