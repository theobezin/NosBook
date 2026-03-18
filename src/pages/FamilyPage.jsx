// ============================================================
// FamilyPage — Gestion de la famille par personnage
// Chaque personnage peut appartenir à une famille différente.
// Rôles : Tête > Assistant > Gardien > Membre
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

const ROLE_ORDER = { head: 0, assistant: 1, guardian: 2, member: 3 }

function RoleBadge({ role, t }) {
  const cls = { head: styles.roleHead, assistant: styles.roleAssistant, guardian: styles.roleGuardian, member: styles.roleMember }[role] ?? styles.roleMember
  return <span className={`${styles.roleBadge} ${cls}`}>{t(`family.roles.${role}`)}</span>
}

// ── Page principale ───────────────────────────────────────────
export default function FamilyPage() {
  const { user, isAuthenticated } = useAuth()
  const { t, lang } = useLang()

  const [loading,       setLoading]       = useState(true)
  const [characters,    setCharacters]    = useState([])      // personnages du joueur
  const [memberships,   setMemberships]   = useState({})      // charId → { family, role, memberId }
  const [managingCharId, setManagingCharId] = useState(null)  // charId dont on gère la famille
  const [familyMembers, setFamilyMembers] = useState([])      // membres de la famille gérée
  const [friends,       setFriends]       = useState([])      // amis sans famille
  const [friendFamilyIds, setFriendFamilyIds] = useState(new Set()) // profile_ids avec famille

  // Formulaire création
  const [createForCharId, setCreateForCharId] = useState(null)
  const [createName,      setCreateName]      = useState('')
  const [createServer,    setCreateServer]    = useState('undercity')
  const [createLoading,   setCreateLoading]   = useState(false)
  const [createErr,       setCreateErr]       = useState(null)

  // Feedback invitation
  const [invitedIds, setInvitedIds] = useState(new Set())

  // Confirmation
  const [confirm, setConfirm] = useState(null)
  const [editingLevel,  setEditingLevel]  = useState(false)
  const [levelInput,    setLevelInput]    = useState(1)

  // ── Chargement ───────────────────────────────────────────────

  useEffect(() => {
    if (!hasSupabase || !user?.id) { setLoading(false); return }
    loadAll()
  }, [user?.id])

  async function loadAll() {
    setLoading(true)
    // 0. Serveur du profil (pré-remplissage du formulaire)
    const { data: prof } = await supabase
      .from('profiles').select('server').eq('id', user.id).single()
    const profileServer = prof?.server ?? 'undercity'
    setCreateServer(profileServer)

    // 1. Personnages du joueur
    const { data: chars } = await supabase
      .from('characters')
      .select('id, name, class, level, hero_level')
      .eq('profile_id', user.id)
      .order('sort_order')
    const charList = chars ?? []
    setCharacters(charList)

    // 2. Memberships de ces personnages
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

    // 3. Amis et leurs memberships
    await loadFriends()
    setLoading(false)
  }

  async function loadFriends() {
    const { data: rows } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    if (!rows || rows.length === 0) { setFriends([]); return }
    const friendIds = rows.map(r => r.requester_id === user.id ? r.addressee_id : r.requester_id)

    const [{ data: profiles }, { data: fmRows }] = await Promise.all([
      supabase.from('profiles').select('id, username, avatar_url').in('id', friendIds),
      // Compte par profile_id (au moins un personnage en famille = "a une famille")
      supabase.from('family_members').select('profile_id').in('profile_id', friendIds),
    ])
    setFriendFamilyIds(new Set((fmRows ?? []).map(m => m.profile_id)))
    setFriends(profiles ?? [])
  }

  async function loadFamilyMembers(familyId) {
    const { data } = await supabase
      .from('family_members')
      .select('id, role, character_id, profile_id, joined_at, characters(name, class), profiles(username)')
      .eq('family_id', familyId)
      .order('joined_at')
    setFamilyMembers(data ?? [])
  }

  // ── Sélection du panneau de gestion ──────────────────────────

  function handleManage(charId) {
    if (managingCharId === charId) { setManagingCharId(null); setEditingLevel(false); return }
    setManagingCharId(charId)
    setEditingLevel(false)
    const mem = memberships[charId]
    if (mem?.family) loadFamilyMembers(mem.family.id)
  }

  // ── Créer une famille ─────────────────────────────────────────

  async function handleCreate(e) {
    e.preventDefault()
    const name   = createName.trim()
    const charId = createForCharId // capture avant tout setState
    if (!name)   { setCreateErr(t('family.errNameRequired')); return }
    if (!charId) { setCreateErr(t('family.errCreate')); return }
    setCreateLoading(true)
    setCreateErr(null)

    const { data: fam, error } = await supabase
      .from('families')
      .insert({ name, server: createServer, head_id: user.id })
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
      // Rollback : supprimer la famille créée
      await supabase.from('families').delete().eq('id', fam.id)
      setCreateErr(t('family.errCreate'))
      setCreateLoading(false)
      return
    }

    setCreateName('')
    setCreateForCharId(null)
    setCreateLoading(false)
    await loadAll()
    setManagingCharId(charId)
    await loadFamilyMembers(fam.id)
  }

  // ── Quitter ───────────────────────────────────────────────────

  function askLeave(charId) {
    const mem = memberships[charId]
    if (!mem) return
    if (mem.role === 'head' && familyMembers.length > 1) {
      setCreateErr(t('family.leaveHeadError'))
      return
    }
    setConfirm({
      message: t('family.leaveConfirm'),
      onConfirm: async () => {
        setConfirm(null)
        if (mem.role === 'head') {
          await supabase.from('families').delete().eq('id', mem.family.id)
        } else {
          await supabase.from('family_members').delete().eq('id', mem.memberId)
        }
        setManagingCharId(null)
        setFamilyMembers([])
        await loadAll()
      },
    })
  }

  // ── Expulser ──────────────────────────────────────────────────

  function askKick(member) {
    setConfirm({
      message: t('family.kickConfirm'),
      onConfirm: async () => {
        setConfirm(null)
        await supabase.from('family_members').delete().eq('id', member.id)
        setFamilyMembers(prev => prev.filter(m => m.id !== member.id))
      },
    })
  }

  // ── Changer de rôle ───────────────────────────────────────────

  async function handleChangeRole(member, newRole) {
    const myMem = memberships[managingCharId]
    if (newRole === 'head') {
      await supabase.from('family_members').update({ role: 'head' }).eq('id', member.id)
      await supabase.from('families').update({ head_id: member.profile_id }).eq('id', myMem.family.id)
      await supabase.from('family_members').update({ role: 'assistant' }).eq('id', myMem.memberId)
      await loadAll()
      setManagingCharId(null)
    } else {
      await supabase.from('family_members').update({ role: newRole }).eq('id', member.id)
      setFamilyMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m))
    }
  }

  // ── Inviter un ami ────────────────────────────────────────────

  async function handleInvite(friend) {
    const myMem = memberships[managingCharId]
    if (!myMem) return
    await supabase.from('notifications').insert({
      user_id:         friend.id,
      type:            'family_invite',
      content_preview: myMem.family.name,
      related_user_id: user.id,
      family_id:       myMem.family.id,
    })
    setInvitedIds(prev => new Set([...prev, friend.id]))
  }

  // ── Ajouter un propre personnage ──────────────────────────────

  async function handleAddMyChar(char) {
    const myMem = memberships[managingCharId]
    if (!myMem) return
    const { error } = await supabase.from('family_members').insert({
      family_id:    myMem.family.id,
      character_id: char.id,
      profile_id:   user.id,
      role:         'member',
    })
    if (!error) {
      await loadAll()
      await loadFamilyMembers(myMem.family.id)
    }
  }

  // ── Modifier le niveau ────────────────────────────────────────

  async function handleSaveLevel(familyId) {
    const lvl = Math.min(30, Math.max(1, levelInput))
    await supabase.from('families').update({ level: lvl }).eq('id', familyId)
    setEditingLevel(false)
    await loadAll()
    await loadFamilyMembers(familyId)
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
            const mem       = memberships[char.id]
            const charCls   = CLASSES[char.class] ?? CLASSES.Archer
            const isManaged = managingCharId === char.id
            const canManage = mem && (mem.role === 'head' || mem.role === 'assistant')
            const levelColor = mem?.family ? getLevelColor(mem.family.level) : null

            return (
              <div key={char.id} className={styles.charSection}>
                {/* Carte du personnage */}
                <div className={`${styles.charCard} ${isManaged ? styles.charCardActive : ''}`}
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
                        🏠 {mem.family.name}
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
                          <button
                            className={`${styles.btnManage} ${isManaged ? styles.btnManageActive : ''}`}
                            onClick={() => handleManage(char.id)}
                          >
                            {isManaged ? '▴' : t('family.manageBtn')}
                          </button>
                        )}
                        <button className={styles.btnLeave} onClick={() => askLeave(char.id)}>
                          {t('family.leaveBtn')}
                        </button>
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
                    {createErr && <p className={styles.err}>{createErr}</p>}
                  </form>
                )}

                {/* Panneau de gestion */}
                {isManaged && mem?.family && (() => {
                  const family      = mem.family
                  const levelColor  = getLevelColor(family.level)
                  const sortedMembers = [...familyMembers].sort(
                    (a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
                  )
                  const invitableFriends = friends.filter(f => !friendFamilyIds.has(f.id))
                  const isHead = mem.role === 'head'

                  return (
                    <div className={styles.managePanel}>
                      {/* En-tête famille */}
                      <div className={styles.familyHeader}>
                        <span className={styles.familyName} style={{ color: levelColor }}>
                          {family.name}
                        </span>
                        {isHead && editingLevel ? (
                          <div className={styles.levelEditRow}>
                            <input
                              type="number" min="1" max="30"
                              className={styles.levelInput}
                              value={levelInput}
                              onChange={e => setLevelInput(Number(e.target.value))}
                            />
                            <button className={styles.btnSaveLevel} onClick={() => handleSaveLevel(family.id)}>✓</button>
                            <button className={styles.btnCancelLevel} onClick={() => setEditingLevel(false)}>✕</button>
                          </div>
                        ) : (
                          <span
                            className={styles.familyLvl}
                            style={{ borderColor: levelColor, color: levelColor, cursor: isHead ? 'pointer' : 'default' }}
                            title={isHead ? t('family.editLevelHint') : undefined}
                            onClick={isHead ? () => { setLevelInput(family.level); setEditingLevel(true) } : undefined}
                          >
                            {t('family.level')} {family.level}{isHead && ' ✎'}
                          </span>
                        )}
                        <span className={styles.serverTag}>{t(`raids.server.${family.server}`)}</span>
                        <span className={styles.familyCount}>
                          {familyMembers.length} {t('family.members')}
                        </span>
                      </div>

                      {/* Membres */}
                      <h3 className={styles.panelTitle}>{t('family.membersTitle')}</h3>
                      <div className={styles.memberList}>
                        {sortedMembers.map(m => {
                          const isMe   = m.profile_id === user.id
                          const charName = m.characters?.name ?? '—'
                          const uname  = m.profiles?.username ?? '—'
                          const canKick = !isMe && isHead && m.role !== 'head'
                          const actions = []
                          if (!isMe && isHead && m.role !== 'head') {
                            if (m.role !== 'assistant') actions.push({ label: t('family.makeAssistant'), role: 'assistant' })
                            if (m.role !== 'guardian')  actions.push({ label: t('family.makeGuardian'),  role: 'guardian' })
                            if (m.role !== 'member')    actions.push({ label: t('family.makeMember'),    role: 'member' })
                            actions.push({ label: t('family.makeHead'), role: 'head' })
                          }
                          if (!isMe && mem.role === 'assistant' && m.role === 'member')
                            actions.push({ label: t('family.makeGuardian'), role: 'guardian' })
                          if (!isMe && mem.role === 'assistant' && m.role === 'guardian')
                            actions.push({ label: t('family.makeMember'), role: 'member' })

                          return (
                            <div key={m.id} className={styles.memberCard}>
                              <div className={styles.memberInfo}>
                                <div className={styles.memberNameRow}>
                                  <Link to={`/players/${uname}`} className={styles.memberName}>{uname}</Link>
                                  {isMe && <span className={styles.youBadge}>{t('family.you')}</span>}
                                </div>
                                <div className={styles.memberMeta}>
                                  <span className={styles.memberChar}>🗡 {charName}</span>
                                  <RoleBadge role={m.role} t={t} />
                                  <span className={styles.joinedAt}>
                                    {t('family.joinedAt')} {new Date(m.joined_at).toLocaleDateString(
                                      lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-US',
                                      { day: 'numeric', month: 'short', year: 'numeric' }
                                    )}
                                  </span>
                                </div>
                              </div>
                              {(actions.length > 0 || canKick) && (
                                <div className={styles.memberActions}>
                                  {actions.map(a => (
                                    <button
                                      key={a.role}
                                      className={a.role === 'head' ? styles.btnMakeHead : styles.btnRole}
                                      onClick={() => handleChangeRole(m, a.role)}
                                    >{a.label}</button>
                                  ))}
                                  {canKick && (
                                    <button className={styles.btnKick} onClick={() => askKick(m)}>
                                      {t('family.kick')}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Invitations */}
                      <h3 className={styles.panelTitle}>{t('family.inviteTitle')}</h3>
                      {invitableFriends.length === 0 ? (
                        <p className={styles.empty}>{t('family.inviteEmpty')}</p>
                      ) : (
                        <div className={styles.inviteList}>
                          {invitableFriends.map(f => {
                            const sent = invitedIds.has(f.id)
                            return (
                              <div key={f.id} className={styles.inviteRow}>
                                <span className={styles.inviteName}>{f.username}</span>
                                <button
                                  className={sent ? styles.btnInvited : styles.btnInvite}
                                  onClick={() => !sent && handleInvite(f)}
                                  disabled={sent}
                                >
                                  {sent ? t('family.inviteSent') : t('family.inviteBtn')}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Ajouter mes autres personnages */}
                      {(() => {
                        const myFreeChars = characters.filter(c => !memberships[c.id])
                        if (myFreeChars.length === 0) return null
                        return (
                          <>
                            <h3 className={styles.panelTitle}>{t('family.addMyCharsTitle')}</h3>
                            <div className={styles.inviteList}>
                              {myFreeChars.map(c => {
                                const charCls = CLASSES[c.class] ?? CLASSES.Archer
                                return (
                                  <div key={c.id} className={styles.inviteRow}>
                                    <span className={styles.inviteName} style={{ color: charCls.color }}>
                                      {charCls.icon} {c.name}
                                    </span>
                                    <button className={styles.btnInvite} onClick={() => handleAddMyChar(c)}>
                                      {t('family.addCharBtn')}
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  )
                })()}
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
