// ============================================================
// FamiliesListPage — Liste publique des familles NosTale
// Accessible depuis le Hub. Recherche par nom + filtre serveur.
// Création de famille intégrée (utilisateurs connectés).
// ============================================================
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import { SERVERS } from '@/lib/market'
import Button from '@/components/ui/Button'
import styles from './FamiliesListPage.module.css'

// ── Couleurs de niveau ────────────────────────────────────────
const LEVEL_COLORS = [
  { max: 1,  color: '#ffffff' },
  { max: 2,  color: '#ffff7f' },
  { max: 3,  color: '#e1e100' },
  { max: 4,  color: '#ccff00' },
  { max: 5,  color: '#99ff00' },
  { max: 6,  color: '#66ff00' },
  { max: 7,  color: '#00ff00' },
  { max: 8,  color: '#00e940' },
  { max: 9,  color: '#00d200' },
  { max: 10, color: '#00c57a' },
  { max: 11, color: '#00b999' },
  { max: 12, color: '#00a8b6' },
  { max: 13, color: '#0099d0' },
  { max: 14, color: '#2897f1' },
  { max: 15, color: '#329dff' },
  { max: 16, color: '#689aff' },
  { max: 17, color: '#819eff' },
  { max: 18, color: '#9788ff' },
  { max: 19, color: '#b07eff' },
  { max: 20, color: '#c874ff' },
  { max: 21, color: '#d978ff' },
  { max: 22, color: '#d8a6f7' },
  { max: 23, color: '#e9c9ff' },
  { max: 24, color: '#ffbdf0' },
  { max: 25, color: '#ff91ca' },
  { max: 26, color: '#ff6b94' },
  { max: 27, color: '#ff5c8a' },
  { max: 28, color: '#ff456d' },
  { max: 29, color: '#ff4545' },
  { max: 30, color: '#ff2121' },
]
function getLevelColor(level) {
  return (LEVEL_COLORS.find(b => level <= b.max) ?? LEVEL_COLORS[LEVEL_COLORS.length - 1]).color
}

// ── Composant carte famille ───────────────────────────────────
function FamilyCard({ family, t, lang, canManage }) {
  const [expanded, setExpanded] = useState(false)
  const [members, setMembers] = useState(null)
  const levelColor = getLevelColor(family.level)
  const memberCount = family.family_members?.length ?? 0
  const headUsername = family.profiles?.username ?? '—'
  const serverLabel = t(`raids.server.${family.server ?? 'undercity'}`)

  async function loadMembers() {
    if (members !== null) { setExpanded(v => !v); return }
    const { data } = await supabase
      .from('family_members')
      .select('role, characters(name, class), profiles(username)')
      .eq('family_id', family.id)
      .order('role')
    setMembers(data ?? [])
    setExpanded(true)
  }

  const ROLE_ORDER = { head: 0, assistant: 1, guardian: 2, member: 3 }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} onClick={loadMembers} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && loadMembers()}
      >
        <div className={styles.cardLeft}>
          <span className={styles.familyName} style={{ color: levelColor }}>
            🏠 {family.name}
          </span>
          <span className={styles.familyLvl} style={{ borderColor: levelColor, color: levelColor }}>
            {t('family.level')} {family.level}
          </span>
          <span className={styles.serverBadge}>{serverLabel}</span>
        </div>
        <div className={styles.cardRight}>
          <span className={styles.memberCount}>{memberCount} {t('family.members')}</span>
          <span className={styles.headLabel}>
            {t('familiesList.head')} :{' '}
            <Link to={`/players/${headUsername}`} className={styles.headLink}
              onClick={e => e.stopPropagation()}>
              {headUsername}
            </Link>
          </span>
          {canManage && (
            <Link
              to="/family"
              className={styles.manageLink}
              onClick={e => e.stopPropagation()}
            >
              {t('familiesList.manageBtn')}
            </Link>
          )}
          <span className={styles.expandCaret}>{expanded ? '▴' : '▾'}</span>
        </div>
      </div>

      {expanded && members && (
        <div className={styles.memberList}>
          {[...members]
            .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))
            .map((m, i) => (
              <div key={i} className={styles.memberRow}>
                <span className={`${styles.roleDot} ${styles['role_' + m.role]}`} />
                <Link to={`/players/${m.profiles?.username ?? ''}`} className={styles.memberUsername}>
                  {m.profiles?.username ?? '—'}
                </Link>
                <span className={styles.memberChar}>({m.characters?.name ?? '—'})</span>
                <span className={styles.memberRole}>{t(`family.roles.${m.role}`)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ── Modal création de famille ─────────────────────────────────
function CreateFamilyModal({ t, user, onClose, onCreated }) {
  const [characters,   setCharacters]   = useState([])
  const [charLoading,  setCharLoading]  = useState(true)
  const [charId,       setCharId]       = useState('')
  const [name,         setName]         = useState('')
  const [server,       setServer]       = useState('undercity')
  const [submitting,   setSubmitting]   = useState(false)
  const [err,          setErr]          = useState(null)

  useEffect(() => {
    if (!hasSupabase || !user?.id) return
    // Charger le serveur du profil + les personnages sans famille
    Promise.all([
      supabase.from('profiles').select('server').eq('id', user.id).single(),
      supabase.from('characters').select('id, name')
        .eq('profile_id', user.id).order('sort_order'),
    ]).then(([{ data: prof }, { data: chars }]) => {
      if (prof?.server) setServer(prof.server)
      // Exclure les personnages déjà dans une famille
      const allChars = chars ?? []
      if (allChars.length === 0) { setCharacters([]); setCharLoading(false); return }
      const charIds = allChars.map(c => c.id)
      supabase.from('family_members').select('character_id').in('character_id', charIds)
        .then(({ data: taken }) => {
          const takenSet = new Set((taken ?? []).map(m => m.character_id))
          const available = allChars.filter(c => !takenSet.has(c.id))
          setCharacters(available)
          if (available.length > 0) setCharId(available[0].id)
          setCharLoading(false)
        })
    })
  }, [user?.id])

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setErr(t('family.errNameRequired')); return }
    if (!charId)  { setErr(t('family.errCreate')); return }
    setSubmitting(true)
    setErr(null)

    const { data: fam, error } = await supabase
      .from('families')
      .insert({ name: trimmed, server, head_id: user.id })
      .select().single()

    if (error) {
      setErr(error.code === '23505' ? t('family.errNameTaken') : t('family.errCreate'))
      setSubmitting(false)
      return
    }

    const { error: memErr } = await supabase.from('family_members').insert({
      family_id:    fam.id,
      character_id: charId,
      profile_id:   user.id,
      role:         'head',
    })

    if (memErr) {
      await supabase.from('families').delete().eq('id', fam.id)
      setErr(t('family.errCreate'))
      setSubmitting(false)
      return
    }

    onCreated(fam)
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>{t('family.createTitle')}</h2>

        {charLoading ? (
          <p className={styles.modalLoading}>…</p>
        ) : characters.length === 0 ? (
          <p className={styles.modalEmpty}>{t('familiesList.noAvailableChar')}</p>
        ) : (
          <form onSubmit={handleSubmit} className={styles.modalForm}>
            <label className={styles.modalLabel}>{t('familiesList.createCharLabel')}</label>
            <select className={styles.modalSelect} value={charId}
              onChange={e => setCharId(e.target.value)} disabled={submitting}>
              {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <label className={styles.modalLabel}>{t('familiesList.serverLabel')}</label>
            <select className={styles.modalSelect} value={server}
              onChange={e => setServer(e.target.value)} disabled={submitting}>
              {SERVERS.map(s => <option key={s} value={s}>{t(`raids.server.${s}`)}</option>)}
            </select>

            <label className={styles.modalLabel}>{t('family.createNameLabel')}</label>
            <input
              className={styles.modalInput}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('family.createNamePh')}
              maxLength={30}
              disabled={submitting}
              autoFocus
            />

            {err && <p className={styles.modalErr}>{err}</p>}

            <div className={styles.modalActions}>
              <Button variant="solid" size="sm" type="submit" disabled={submitting}>
                {submitting ? t('family.creating') : t('family.confirmCreate')}
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={onClose}>
                {t('session.cancel')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function FamiliesListPage() {
  const { user, isAuthenticated } = useAuth()
  const { t, lang } = useLang()

  const [families,     setFamilies]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [serverFilter, setServerFilter] = useState('all')
  const [showCreate,   setShowCreate]   = useState(false)
  const [myManagedFamilyIds, setMyManagedFamilyIds] = useState(new Set())

  function fetchFamilies() {
    if (!hasSupabase) { setLoading(false); return }
    supabase
      .from('families')
      .select('id, name, level, server, profiles!head_id(username), family_members(character_id)')
      .order('level', { ascending: false })
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setFamilies(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => { fetchFamilies() }, [])

  useEffect(() => {
    if (!hasSupabase || !user?.id) return
    supabase.from('family_members').select('family_id, role')
      .eq('profile_id', user.id)
      .in('role', ['head', 'assistant'])
      .then(({ data }) => {
        setMyManagedFamilyIds(new Set((data ?? []).map(m => m.family_id)))
      })
  }, [user?.id])

  function handleCreated(fam) {
    setShowCreate(false)
    setLoading(true)
    fetchFamilies()
  }

  const filtered = families
    .filter(f => serverFilter === 'all' || f.server === serverFilter)
    .filter(f => !search.trim() || f.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderRow}>
          <div>
            <h1 className={styles.title}>🏠 {t('familiesList.title')}</h1>
            <p className={styles.sub}>{t('familiesList.sub')}</p>
          </div>
          {isAuthenticated && (
            <Button variant="solid" size="sm" onClick={() => setShowCreate(true)}>
              + {t('familiesList.createBtn')}
            </Button>
          )}
        </div>
      </div>

      <div className={styles.serverTabs}>
        {['all', ...SERVERS].map(s => (
          <button
            key={s}
            className={`${styles.serverTab} ${serverFilter === s ? styles.serverTabActive : ''}`}
            onClick={() => setServerFilter(s)}
          >
            {s === 'all' ? t('raids.server.all') : t(`raids.server.${s}`)}
          </button>
        ))}
      </div>

      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('familiesList.searchPh')}
        />
        <span className={styles.total}>{t('familiesList.total', { n: filtered.length })}</span>
      </div>

      {loading ? (
        <div className={styles.list}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`${styles.card} ${styles.skeleton}`} style={{ height: 68 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>{t('familiesList.empty')}</p>
      ) : (
        <div className={styles.list}>
          {filtered.map(f => (
            <FamilyCard key={f.id} family={f} t={t} lang={lang} canManage={myManagedFamilyIds.has(f.id)} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateFamilyModal
          t={t}
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
