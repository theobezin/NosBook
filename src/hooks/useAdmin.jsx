import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, hasSupabase } from '@/lib/supabase'

/**
 * Vérifie si l'utilisateur courant est admin NosBook.
 * Attend la fin du chargement de l'auth avant de requêter la DB.
 * Retourne { isAdmin: bool, loading: bool }
 */
export function useAdmin() {
  const { user, loading: authLoading } = useAuth()
  const [isAdmin,  setIsAdmin]  = useState(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    // Attend que useAuth ait fini de résoudre la session
    if (authLoading) return

    if (!user || !hasSupabase) {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        setIsAdmin(!error && data?.is_admin === true)
        setLoading(false)
      })
  }, [user?.id, authLoading])

  return { isAdmin, loading }
}
