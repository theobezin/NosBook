// ============================================================
// FamilyPage — Vue d'ensemble des affiliations de famille
// Chaque personnage peut appartenir à une famille différente.
// La gestion complète se fait via /families/:id
// ============================================================
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import { CLASSES } from '@/lib/mockData'
import { SERVERS } from '@/lib/market'
import Button from '@/components/ui/Button'
import styles from './FamilyPage.module.css'

// ── Couleurs de niveau famille ────────────────────────────────
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

function RoleBadge({ role, t }) {
  const cls = { head: styles.roleHead, assistant: styles.roleAssistant, guardian: styles.roleGuardian, member: styles.roleMember }[role] ?? styles.roleMember
  return <span className={`${styles.roleBadge} ${cls}`}>{t(`family.roles.${role}`)}</span>
}

// ── Page principale ───────────────────────────────────────────
export default function FamilyPage() {
  const { user, isAuthenticated } = useAuth()
  const { t } = useLang()

  const [loading,       setLoading]       = useState(true)
  const [characters,    setCharacters]    = useState([])
  const [memberships,   setMemberships]   = useState({})

  // Formulaire création
  const [createForCharId, setCreateForCharId] = useState(null)
  const [createName,      setCreateName]      = useState('')
  const [createServer,    setCreateServer]    = useState('undercity')
  const [createDesc,      setCreateDesc]      = useState('')
  const [createDiscord,   setCreateDiscord]   = useState('')
  const [createLoading,   setCreateLoading]   = useState(false)
  const [createErr,       setCreateErr]       = useState(null)

  // Confirmation quitter
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    if (!hasSupabase || !user?.id) { setLoading(false); return }
    loadAll()
  }, [user?.id])

  async function loadAll() {
    setLoading(true)

    const { data: prof } = await supabase
      .from('profiles').select('server').eq('id', user.id).single()
    setCreateServer(prof?.server ?? 'undercity')

    const { data: chars } = await supabase
      .from('characters')
      .select('id, name, class, level, hero_level')
      .eq('profile_id', user.id)
      .order('sort_order')
    const charList = chars ?? []
    setCharacters(charList)

    if (charList.length > 0) {
      const charIds = charList.map(c => c.id)
      const { data: mRows } = await supabase
        .from('family_members')
        .select('id, character_id, role, family_id, families(id, name, level, server, head_id)')
        .in('character_id', charIds)
      const map = {}
      ;(mRows ?? []).forEach(m => {
        map[m.character_id] = { family: m.families, role: m.role, memberId: m.id }
      })
      setMemberships(map)
    }

    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    const name   = createName.trim()
    const charId = createForCharId
    if (!name)   { setCreateErr(t('family.errNameRequired')); return }
    if (!charId) { setCreateErr(t('family.errCreate')); return }
    setCreateLoading(true)
    setCreateErr(null)

    const { data: fam, error } = await supabase
      .from('families')
      .insert({ name, server: createServer, head_id: user.id, description: createDesc.trim() || null, discord_url: createDiscord.trim() || null })
      .select()
      .single()

    if (error) {
      setCreateErr(error.code === '23505' ? t('family.errNameTaken') : t('family.errCreate'))
      setCreateLoading(false)
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
      setCreateErr(t('family.errCreate'))
      setCreateLoading(false)
      return
    }

    setCreateName('')
    setCreateDesc('')
    setCreateDiscord('')
    setCreateForCharId(null)
    setCreateLoading(false)
    await loadAll()
  }

  function askLeave(charId) {
    const mem = memberships[charId]
    if (!mem) return
    setConfirm({
      message: t('family.leaveConfirm'),
      onConfirm: async () => {
        setConfirm(null)
        await supabase.from('family_members').delete().eq('id', mem.memberId)
        await loadAll()
      },
    })
  }

  // ── Rendu ─────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>🏠 {t('family.title')}</h1>
        <p className={styles.empty}><Link to="/auth?mode=login">{t('nav.signIn')}</Link></p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.page}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.skeleton} style={{ height: 80, borderRadius: 10 }} />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>🏠 {t('family.title')}</h1>

      {characters.length === 0 ? (
        <p className={styles.empty}>{t('family.noCharacters')}</p>
      ) : (
        <div className={styles.charList}>
          {characters.map(char => {
            const mem        = memberships[char.id]
            const charCls    = CLASSES[char.class] ?? CLASSES.Archer
            const levelColor = mem?.family ? getLevelColor(mem.family.level) : null
            const canManage  = mem && (mem.role === 'head' || mem.role === 'assistant')

            return (
              <div key={char.id} className={styles.charSection}>
                <div className={`${styles.charCard} ${createForCharId === char.id ? styles.charCardActive : ''}`}
                  style={{ '--cls': charCls.color }}
                >
                  <div className={styles.charAvatar} style={{ borderColor: charCls.color + '88' }}>
                    {charCls.icon}
                  </div>
                  <div className={styles.charInfo}>
                    <span className={styles.charName}>{char.name}</span>
                    <span className={styles.charSub} style={{ color: charCls.color }}>
                      {t(`classes.${char.class}`)} · Niv.{char.level}
                    </span>
                    {mem?.family ? (
                      <span className={styles.charFamily} style={{ color: levelColor }}>
                        🏠{' '}
                        <Link to={`/families/${mem.family.id}`} className={styles.familyLink} style={{ color: levelColor }}>
                          {mem.family.name}
                        </Link>
                        <span className={styles.charFamilyLevel}>Niv.{mem.family.level}</span>
                        <span className={styles.serverTag}>{t(`raids.server.${mem.family.server}`)}</span>
                        <RoleBadge role={mem.role} t={t} />
                      </span>
                    ) : (
                      <span className={styles.charNoFamily}>{t('family.noFamily')}</span>
                    )}
                  </div>
                  <div className={styles.charActions}>
                    {mem ? (
                      <>
                        {canManage && (
                          <Link to={`/families/${mem.family.id}`} className={styles.btnManage}>
                            {t('family.manageBtn')}
                          </Link>
                        )}
                        {mem.role !== 'head' && (
                          <button className={styles.btnLeave} onClick={() => askLeave(char.id)}>
                            {t('family.leaveBtn')}
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        className={`${styles.btnCreate} ${createForCharId === char.id ? styles.btnCreateActive : ''}`}
                        onClick={() => setCreateForCharId(createForCharId === char.id ? null : char.id)}
                      >
                        {createForCharId === char.id ? '▴' : t('family.createBtn')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Formulaire de création */}
                {createForCharId === char.id && (
                  <form className={styles.createForm} onSubmit={handleCreate}>
                    <h3 className={styles.panelTitle}>{t('family.createTitle')}</h3>
                    <div className={styles.createRow}>
                      <select
                        className={styles.serverSelect}
                        value={createServer}
                        onChange={e => setCreateServer(e.target.value)}
                        disabled={createLoading}
                      >
                        {SERVERS.map(s => (
                          <option key={s} value={s}>{t(`raids.server.${s}`)}</option>
                        ))}
                      </select>
                      <input
                        className={styles.createInput}
                        value={createName}
                        onChange={e => setCreateName(e.target.value)}
                        placeholder={t('family.createNamePh')}
                        maxLength={30}
                        disabled={createLoading}
                        autoFocus
                      />
                      <Button variant="solid" size="sm" type="submit" disabled={createLoading}>
                        {createLoading ? t('family.creating') : t('family.confirmCreate')}
                      </Button>
                    </div>
                    <textarea
                      className={styles.createTextarea}
                      value={createDesc}
                      onChange={e => setCreateDesc(e.target.value)}
                      placeholder={t('family.descPh')}
                      rows={2}
                      maxLength={300}
                      disabled={createLoading}
                    />
                    <input
                      className={styles.createInput}
                      value={createDiscord}
                      onChange={e => setCreateDiscord(e.target.value)}
                      placeholder={t('family.discordUrlPh')}
                      disabled={createLoading}
                    />
                    {createErr && <p className={styles.err}>{createErr}</p>}
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de confirmation */}
      {confirm && (
        <div className={styles.confirmOverlay} onClick={() => setConfirm(null)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <p className={styles.confirmMsg}>{confirm.message}</p>
            <div className={styles.confirmActions}>
              <Button variant="solid" size="sm" onClick={confirm.onConfirm}>OK</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirm(null)}>{t('session.cancel')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
