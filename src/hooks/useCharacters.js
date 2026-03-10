import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, hasSupabase } from '@/lib/supabase'

const lsKey = (uid) => `nosbook-chars-${uid}`

// ── DB ↔ JS mapping ────────────────────────────────────────────────────────

function fromDB(row) {
  return {
    id:          row.id,
    name:        row.name,
    server:      row.server      ?? null,
    class:       row.class,
    level:       row.level,
    heroLevel:   row.hero_level,
    prestige:    row.prestige,
    element:     row.element,
    stats:       row.stats       ?? {},
    equipment:   row.equipment   ?? {},
    resistances: row.resistances ?? {},
  }
}

function toDB(char, profileId, sortOrder) {
  return {
    id:          char.id,
    profile_id:  profileId,
    sort_order:  sortOrder,
    name:        char.name,
    class:       char.class,
    level:       char.level,
    hero_level:  char.heroLevel,
    prestige:    char.prestige,
    element:     char.element,
    stats:       char.stats,
    equipment:   char.equipment,
    resistances: char.resistances,
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useCharacters() {
  const { user } = useAuth()
  const [characters, setCharacters] = useState([])
  const [loading,    setLoading]    = useState(true)

  // Load on mount / user change
  useEffect(() => {
    if (!user) { setCharacters([]); setLoading(false); return }

    setLoading(true)

    if (hasSupabase) {
      supabase
        .from('characters')
        .select('*')
        .eq('profile_id', user.id)
        .order('sort_order', { ascending: true })
        .then(({ data }) => {
          if (data) setCharacters(data.map(fromDB))
        })
        .finally(() => setLoading(false))
    } else {
      try {
        const raw = localStorage.getItem(lsKey(user.id))
        setCharacters(raw ? JSON.parse(raw) : [])
      } catch {
        setCharacters([])
      }
      setLoading(false)
    }
  }, [user?.id])

  const addCharacter = useCallback(async (char) => {
    if (!user) return

    if (hasSupabase) {
      const { data, error } = await supabase
        .from('characters')
        .insert(toDB(char, user.id, characters.length))
        .select()
        .single()
      if (!error && data) setCharacters(prev => [...prev, fromDB(data)])
    } else {
      const next = [...characters, char]
      setCharacters(next)
      localStorage.setItem(lsKey(user.id), JSON.stringify(next))
    }
  }, [user, characters])

  const updateCharacter = useCallback(async (id, updates) => {
    if (!user) return
    const char = characters.find(c => c.id === id)
    if (!char) return
    const merged = { ...char, ...updates }

    if (hasSupabase) {
      const { data, error } = await supabase
        .from('characters')
        .update({
          name:        merged.name,
          class:       merged.class,
          level:       merged.level,
          hero_level:  merged.heroLevel,
          prestige:    merged.prestige,
          element:     merged.element,
          stats:       merged.stats,
          equipment:   merged.equipment,
          resistances: merged.resistances,
        })
        .eq('id', id)
        .eq('profile_id', user.id)
        .select()
        .single()
      if (!error && data) setCharacters(prev => prev.map(c => c.id === id ? fromDB(data) : c))
    } else {
      const next = characters.map(c => c.id === id ? merged : c)
      setCharacters(next)
      localStorage.setItem(lsKey(user.id), JSON.stringify(next))
    }
  }, [user, characters])

  return { characters, addCharacter, updateCharacter, loading }
}
