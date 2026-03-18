// ============================================================
// FamiliesListPage — Liste publique des familles NosTale
// Accessible depuis le Hub. Recherche par nom.
// ============================================================
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import styles from './FamiliesListPage.module.css'

// ── Couleurs de niveau ────────────────────────────────────────
const LEVEL_COLORS = [
  { max: 3,  color: '#a0a0a0' },
  { max: 6,  color: '#5dc85d' },
  { max: 10, color: '#4499ff' },
  { max: 14, color: '#bb44ff' },
  { max: 18, color: '#ff8833' },
  { max: 22, color: '#ff3333' },
  { max: 26, color: '#ff66aa' },
  { max: 30, color: '#ffcc00' },
]
function getLevelColor(level) {
  return (LEVEL_COLORS.find(b => level <= b.max) ?? LEVEL_COLORS[LEVEL_COLORS.length - 1]).color
}

// ── Composant carte famille ───────────────────────────────────
function FamilyCard({ family, t, lang }) {
  const [expanded, setExpanded] = useState(false)
  const [members, setMembers] = useState(null)
  const levelColor = getLevelColor(family.level)
  const memberCount = family.family_members?.length ?? 0
  const headUsername = family.profiles?.username ?? '—'

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

// ── Page principale ───────────────────────────────────────────
export default function FamiliesListPage() {
  const { t, lang } = useLang()

  const [families, setFamilies] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    if (!hasSupabase) { setLoading(false); return }
    supabase
      .from('families')
      .select('id, name, level, profiles!head_id(username), family_members(character_id)')
      .order('level', { ascending: false })
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setFamilies(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = search.trim()
    ? families.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : families

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>🏠 {t('familiesList.title')}</h1>
        <p className={styles.sub}>{t('familiesList.sub')}</p>
      </div>

      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('familiesList.searchPh')}
        />
        <span className={styles.total}>{t('familiesList.total', { n: families.length })}</span>
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
            <FamilyCard key={f.id} family={f} t={t} lang={lang} />
          ))}
        </div>
      )}
    </div>
  )
}
