import { useState, useEffect } from 'react'
import { supabase, hasSupabase } from '@/lib/supabase'
import { mockPlayer } from '@/lib/mockData'

export function useProfile(userId) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !hasSupabase || userId === 'mock-id') {
      setProfile(mockPlayer)
      setLoading(false)
      return
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        setProfile(error ? mockPlayer : data)
        setLoading(false)
      })
  }, [userId])

  return { profile, loading }
}
