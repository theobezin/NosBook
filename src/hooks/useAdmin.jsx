import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, hasSupabase } from '@/lib/supabase'

/**
 * Vérifie si l'utilisateur courant est admin ou modérateur NosBook.
 * Expose aussi les fonctions de gestion des badges et rôles (admin uniquement).
 */
export function useAdmin() {
  const { user, loading: authLoading } = useAuth()
  const [isAdmin,     setIsAdmin]     = useState(false)
  const [isModerator, setIsModerator] = useState(false)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user || !hasSupabase) {
      setIsAdmin(false)
      setIsModerator(false)
      setLoading(false)
      return
    }
    supabase
      .from('profiles')
      .select('is_admin, is_moderator')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        setIsAdmin(!error && data?.is_admin === true)
        setIsModerator(!error && (data?.is_moderator === true || data?.is_admin === true))
        setLoading(false)
      })
  }, [user?.id, authLoading])

  // ── Admin : gestion badges ─────────────────────────────────────────────
  async function setBadges(profileId, badges) {
    const { error } = await supabase.rpc('admin_set_badges', {
      p_profile_id: profileId,
      p_badges:     badges,
    })
    return { error }
  }

  // ── Admin : gestion modérateur ─────────────────────────────────────────
  async function setModerator(profileId, value) {
    const { error } = await supabase.rpc('admin_set_moderator', {
      p_profile_id: profileId,
      p_value:      value,
    })
    return { error }
  }

  // ── Admin : recherche joueurs ──────────────────────────────────────────
  async function searchPlayers(query) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, badges, is_moderator, is_admin')
      .ilike('username', `%${query}%`)
      .order('username')
      .limit(20)
    return { data: data ?? [], error }
  }

  return { isAdmin, isModerator, loading, setBadges, setModerator, searchPlayers }
}
