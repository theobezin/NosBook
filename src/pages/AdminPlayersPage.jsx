import { useState } from 'react'
import { useAdmin } from '@/hooks/useAdmin'
import { useLang } from '@/i18n'
import { BADGE_DEFS } from '@/components/BadgeDisplay'
import styles from './AdminPlayersPage.module.css'

const AVAILABLE_BADGES = Object.keys(BADGE_DEFS)

export default function AdminPlayersPage() {
  const { isAdmin, loading, setBadges, setModerator, searchPlayers } = useAdmin()
  const { t } = useLang()

  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [saving,  setSaving]  = useState({}) // { [profileId]: bool }
  const [errors,  setErrors]  = useState({}) // { [profileId]: string }
  const [drafts,  setDrafts]  = useState({}) // { [profileId]: { badges, isModerator } }

  if (loading) return null
  if (!isAdmin) return <div className={styles.denied}>⛔ Accès refusé</div>

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    const { data } = await searchPlayers(query.trim())
    setResults(data)
    // Initialiser les drafts avec les valeurs actuelles
    const initial = {}
    data.forEach(p => {
      initial[p.id] = { badges: p.badges ?? [], isModerator: p.is_moderator ?? false }
    })
    setDrafts(initial)
    setSearching(false)
  }

  function toggleBadge(profileId, badge) {
    setDrafts(prev => {
      const cur = prev[profileId]?.badges ?? []
      const next = cur.includes(badge) ? cur.filter(b => b !== badge) : [...cur, badge]
      return { ...prev, [profileId]: { ...prev[profileId], badges: next } }
    })
  }

  function toggleMod(profileId) {
    setDrafts(prev => ({
      ...prev,
      [profileId]: { ...prev[profileId], isModerator: !prev[profileId]?.isModerator },
    }))
  }

  async function handleSave(profileId) {
    const draft = drafts[profileId]
    if (!draft) return
    setSaving(p => ({ ...p, [profileId]: true }))
    setErrors(p => ({ ...p, [profileId]: null }))

    const original = results.find(r => r.id === profileId)
    const promises = []

    if (JSON.stringify(draft.badges.sort()) !== JSON.stringify((original.badges ?? []).sort())) {
      promises.push(setBadges(profileId, draft.badges))
    }
    if (draft.isModerator !== (original.is_moderator ?? false)) {
      promises.push(setModerator(profileId, draft.isModerator))
    }

    const results2 = await Promise.all(promises)
    const err = results2.find(r => r?.error)?.error
    if (err) {
      setErrors(p => ({ ...p, [profileId]: err.message ?? 'Erreur' }))
    } else {
      // Mettre à jour le résultat local
      setResults(prev => prev.map(r =>
        r.id === profileId
          ? { ...r, badges: draft.badges, is_moderator: draft.isModerator }
          : r
      ))
    }
    setSaving(p => ({ ...p, [profileId]: false }))
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>👥 Gestion des joueurs</h1>
      <p className={styles.sub}>Attribuer badges et rôles aux joueurs NosBook.</p>

      <form className={styles.searchRow} onSubmit={handleSearch}>
        <input
          className={styles.searchInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un joueur..."
        />
        <button className={styles.searchBtn} type="submit" disabled={searching}>
          {searching ? '…' : '🔍 Rechercher'}
        </button>
      </form>

      {results.length > 0 && (
        <div className={styles.list}>
          {results.map(player => {
            const draft  = drafts[player.id] ?? { badges: player.badges ?? [], isModerator: player.is_moderator ?? false }
            const isSaving = !!saving[player.id]
            const errMsg   = errors[player.id]

            return (
              <div key={player.id} className={styles.playerCard}>
                <div className={styles.playerHeader}>
                  <span className={styles.playerName}>{player.username}</span>
                  {player.is_admin && <span className={styles.adminTag}>Admin</span>}
                </div>

                {/* Badges manuels */}
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>Badges</div>
                  <div className={styles.badgeGrid}>
                    {AVAILABLE_BADGES.map(id => {
                      const def     = BADGE_DEFS[id]
                      const checked = draft.badges.includes(id)
                      return (
                        <label
                          key={id}
                          className={`${styles.badgeToggle} ${checked ? styles.badgeToggleOn : ''}`}
                          style={checked ? { borderColor: def.color + '88', background: def.color + '18', color: def.color } : {}}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleBadge(player.id, id)}
                            disabled={isSaving}
                          />
                          {def.icon} {t(`badges.${id === 'beta_tester' ? 'betaTester' : id}`)}
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Rôle modérateur */}
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>Rôle</div>
                  <label
                    className={`${styles.badgeToggle} ${draft.isModerator ? styles.badgeToggleOn : ''}`}
                    style={draft.isModerator ? { borderColor: '#2ecc7188', background: '#2ecc7118', color: '#2ecc71' } : {}}
                  >
                    <input
                      type="checkbox"
                      checked={draft.isModerator}
                      onChange={() => toggleMod(player.id)}
                      disabled={isSaving || player.is_admin}
                    />
                    🛡️ Modérateur
                    {player.is_admin && <span style={{ fontSize: '0.72em', opacity: 0.6, marginLeft: 4 }}>(admin = auto)</span>}
                  </label>
                </div>

                {errMsg && <div className={styles.errMsg}>{errMsg}</div>}

                <button
                  className={styles.saveBtn}
                  onClick={() => handleSave(player.id)}
                  disabled={isSaving}
                >
                  {isSaving ? 'Enregistrement…' : '✓ Enregistrer'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {results.length === 0 && !searching && query && (
        <div className={styles.empty}>Aucun joueur trouvé.</div>
      )}
    </div>
  )
}
