import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, hasSupabase } from '@/lib/supabase'
import { RAIDS } from '@/lib/raids'

// ── Clé localStorage ───────────────────────────────────────────────────────
// Isolée par userId pour éviter tout partage de données entre comptes.
// Si non connecté : clé "guest" (données locales uniquement).
const lsKey = (uid) => `nostale-planner-save-${uid ?? 'guest'}`

// ── Valeur par défaut ──────────────────────────────────────────────────────
const DEFAULT_DATA = {
  theme:      'dark',
  chars:      [],       // rempli dynamiquement avec t('planner.defaultChar')
  activeChar: null,     // null = sera initialisé au premier render
  blocks:     [],
  checks:     {},
  raids:      {},
  goals:      [],
  notes:      [],
}

// ── Hook principal ─────────────────────────────────────────────────────────
//
// Stratégie de sync :
//   1. Au montage → charge depuis Supabase (si dispo) ou localStorage
//   2. À chaque changement → debounce 800ms → sauvegarde
//
// Fallback gracieux :
//   - Si Supabase non configuré  → localStorage par userId
//   - Si non connecté            → localStorage clé "guest"
//   - Si erreur Supabase         → localStorage comme backup silencieux
//
// Schéma Supabase attendu (voir supabase_schema.sql) :
//   table profiles: colonne planner_data JSONB DEFAULT '{}'
//
export function usePlannerData(defaultCharName) {
  const { user } = useAuth()
  const uid = user?.id ?? null

  const [data,    setData]    = useState(null)   // null = pas encore chargé
  const [loaded,  setLoaded]  = useState(false)
  const [syncing, setSyncing] = useState(false)  // indicateur UI sauvegarde
  const [syncErr, setSyncErr] = useState(false)

  // Ref pour éviter la sauvegarde au premier chargement
  const isFirstLoad = useRef(true)

  // ── Helpers ──────────────────────────────────────────────────────────────

  function parseData(raw) {
    try {
      const d = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (!d || typeof d !== 'object') return null
      return {
        theme:      d.theme      ?? DEFAULT_DATA.theme,
        chars:      Array.isArray(d.chars) && d.chars.length > 0
                      ? d.chars
                      : [],
        activeChar: d.activeChar ?? null,
        blocks:     Array.isArray(d.blocks) ? d.blocks : [],
        checks:     d.checks     && typeof d.checks === 'object'  ? d.checks : {},
        raids:      d.raids      && typeof d.raids  === 'object'  ? d.raids  : {},
        goals:      Array.isArray(d.goals) ? d.goals : [],
        notes:      Array.isArray(d.notes) ? d.notes : [],
      }
    } catch {
      return null
    }
  }

  function defaultState() {
    return { ...DEFAULT_DATA }
  }

  // ── Chargement ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoaded(false)
      isFirstLoad.current = true

      let loaded = null

      // 1. Essaie Supabase si configuré et utilisateur connecté
      if (hasSupabase && uid) {
        try {
          const { data: row, error } = await supabase
            .from('profiles')
            .select('planner_data')
            .eq('id', uid)
            .single()

          if (!error && row?.planner_data) {
            loaded = parseData(row.planner_data)
          }
        } catch (e) {
          console.warn('usePlannerData: Supabase load failed, falling back to localStorage', e)
        }
      }

      // 2. Fallback localStorage (aussi utilisé quand Supabase non configuré)
      if (!loaded) {
        try {
          const raw = localStorage.getItem(lsKey(uid))
          if (raw) loaded = parseData(raw)
        } catch (e) {
          console.warn('usePlannerData: localStorage load failed', e)
        }
      }

      if (!cancelled) {
        setData(loaded ?? defaultState())
        setLoaded(true)
        // Petite pause pour laisser le state se stabiliser avant d'activer les saves
        setTimeout(() => { isFirstLoad.current = false }, 100)
      }
    }

    load()
    return () => { cancelled = true }
  }, [uid]) // recharge si l'utilisateur change (login/logout)

  // ── Sauvegarde auto debounce ───────────────────────────────────────────────

  const saveTimeout = useRef(null)

  useEffect(() => {
    if (!loaded || isFirstLoad.current || data === null) return

    if (saveTimeout.current) clearTimeout(saveTimeout.current)

    saveTimeout.current = setTimeout(async () => {
      setSyncing(true)
      setSyncErr(false)

      // Toujours sauvegarder en localStorage en premier (backup immédiat)
      try {
        localStorage.setItem(lsKey(uid), JSON.stringify(data))
      } catch (e) {
        console.warn('usePlannerData: localStorage save failed', e)
      }

      // Puis sync Supabase si disponible et connecté
      if (hasSupabase && uid) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ planner_data: data })
            .eq('id', uid)

          if (error) {
            console.warn('usePlannerData: Supabase save failed', error)
            setSyncErr(true)
          }
        } catch (e) {
          console.warn('usePlannerData: Supabase save exception', e)
          setSyncErr(true)
        }
      }

      setSyncing(false)
    }, 800)

    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current) }
  }, [data, loaded, uid])

  // ── Setters individuels ────────────────────────────────────────────────────
  // Chaque setter met à jour un champ précis de data, ce qui déclenche la sauvegarde auto.

  const setTheme      = useCallback(v  => setData(d => ({ ...d, theme:      typeof v === 'function' ? v(d.theme)      : v })), [])
  const setChars      = useCallback(v  => setData(d => ({ ...d, chars:      typeof v === 'function' ? v(d.chars)      : v })), [])
  const setActiveChar = useCallback(v  => setData(d => ({ ...d, activeChar: typeof v === 'function' ? v(d.activeChar) : v })), [])
  const setBlocks     = useCallback(v  => setData(d => ({ ...d, blocks:     typeof v === 'function' ? v(d.blocks)     : v })), [])
  const setChecks     = useCallback(v  => setData(d => ({ ...d, checks:     typeof v === 'function' ? v(d.checks)     : v })), [])
  const setRaids      = useCallback(v  => setData(d => ({ ...d, raids:      typeof v === 'function' ? v(d.raids)      : v })), [])
  const setGoals      = useCallback(v  => setData(d => ({ ...d, goals:      typeof v === 'function' ? v(d.goals)      : v })), [])
  const setNotes      = useCallback(v  => setData(d => ({ ...d, notes:      typeof v === 'function' ? v(d.notes)      : v })), [])

  return {
    // State
    loaded,
    syncing,
    syncErr,
    // Data fields (avec fallback pour éviter undefined pendant le chargement)
    theme:      data?.theme      ?? DEFAULT_DATA.theme,
    chars:      data?.chars      ?? [],
    activeChar: data?.activeChar ?? null,
    blocks:     data?.blocks     ?? [],
    checks:     data?.checks     ?? {},
    raids:      data?.raids      ?? {},
    goals:      data?.goals      ?? [],
    notes:      data?.notes      ?? [],
    // Setters
    setTheme, setChars, setActiveChar,
    setBlocks, setChecks, setRaids, setGoals, setNotes,
  }
}

// ── useSessionBlocks ─────────────────────────────────────────────────────────
//
// Récupère les sessions de raid auxquelles l'utilisateur courant est inscrit
// (comme leader ou membre) et les convertit en "blocs virtuels" au format
// identique aux blocs du planner — mais en lecture seule (_isSession: true).
//
// Sync unidirectionnelle : raid_sessions / raid_session_registrations → planner
// Les blocs session ne sont JAMAIS écrits dans planner_data.
//
// Temps réel :
//   - raid_session_registrations : déjà dans supabase_realtime (join/leave)
//   - raid_sessions               : ajouter si besoin de refléter les changements
//     d'horaire en live →  ALTER PUBLICATION supabase_realtime
//                          ADD TABLE public.raid_sessions;
//
export function useSessionBlocks(uid, lang = 'fr') {
  const [sessionBlocks, setSessionBlocks]     = useState([])
  const [sessionBlocksLoading, setLoading]    = useState(false)

  // Construit les blocs à partir des lignes de registrations + session jointes
  const buildBlocks = useCallback((rows, currentLang) => {
    return rows.flatMap(reg => {
      const session = reg.raid_sessions
      if (!session?.date) return []

      const raid = RAIDS.find(r => r.slug === session.raid_slug)
      if (!raid) return []

      const charName = reg.character_snapshot?.name
      if (!charName) return []

      // Convertit l'heure HH:MM[:SS] en décimal (ex: 14:30 → 14.5)
      let startHour = 0
      if (session.time) {
        const [h, m] = session.time.split(':').map(Number)
        startHour = h + m / 60
      }
      const durationH = session.duration_minutes ? session.duration_minutes / 60 : 1
      const endHour   = Math.min(startHour + durationH, 24)

      return [{
        // Préfixe "session_" sur l'ID pour garantir l'unicité avec les blocs perso
        id:          `session_${reg.id}`,
        char:        charName,
        type:        'raid',
        label:       raid[currentLang] ?? raid.fr,
        icon:        raid.icon,
        raidId:      null,
        startHour,
        endHour,
        day:         session.date,   // 'YYYY-MM-DD'
        repeat:      false,
        repeatDays:  [],
        reminder:    { enabled: false },
        // ── Marqueurs lecture seule ──────────────────────────────────────────
        _isSession:     true,
        _sessionId:     session.id,
        _raidColor:     raid.color,
        _sessionLeader: session.leader_username ?? null,
      }]
    })
  }, [])

  const load = useCallback(async () => {
    if (!uid || !hasSupabase) { setSessionBlocks([]); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('raid_session_registrations')
        .select(`
          id,
          character_snapshot,
          session_id,
          raid_sessions (
            id,
            raid_slug,
            date,
            time,
            duration_minutes,
            leader_username
          )
        `)
        .eq('player_id', uid)

      if (error) {
        console.warn('useSessionBlocks: fetch failed', error)
        return
      }
      setSessionBlocks(buildBlocks(data ?? [], lang))
    } catch (e) {
      console.warn('useSessionBlocks: exception', e)
    } finally {
      setLoading(false)
    }
  }, [uid, lang, buildBlocks])

  // Chargement initial + rechargement si uid ou langue change
  useEffect(() => {
    load()
  }, [load])

  // Abonnement Realtime :
  //   • raid_session_registrations → capte join/leave de l'utilisateur
  //   • raid_sessions               → capte les changements d'horaire du leader
  //     (requiert ALTER PUBLICATION supabase_realtime ADD TABLE public.raid_sessions)
  useEffect(() => {
    if (!uid || !hasSupabase) return

    const channel = supabase
      .channel(`session-blocks-${uid}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'raid_session_registrations',
        filter: `player_id=eq.${uid}`,
      }, load)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'raid_sessions',
      }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [uid, load])

  return { sessionBlocks, sessionBlocksLoading }
}
