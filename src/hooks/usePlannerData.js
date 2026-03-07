import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, hasSupabase } from '@/lib/supabase'

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
                      : [defaultCharName],
        activeChar: d.activeChar ?? defaultCharName,
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
    return { ...DEFAULT_DATA, chars: [defaultCharName], activeChar: defaultCharName }
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
    chars:      data?.chars      ?? [defaultCharName],
    activeChar: data?.activeChar ?? defaultCharName,
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
