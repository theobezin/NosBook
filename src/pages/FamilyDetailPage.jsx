// ============================================================
// FamilyDetailPage — Détail et gestion complète d'une famille
// ============================================================
import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import { CLASSES } from '@/lib/mockData'
import { FAMILY_TAGS } from '@/lib/families'
import Button from '@/components/ui/Button'
import styles from './FamilyDetailPage.module.css'

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
  const cls = {
    head:      styles.roleHead,
    assistant: styles.roleAssistant,
    guardian:  styles.roleGuardian,
    member:    styles.roleMember,
  }[role] ?? styles.roleMember
  return <span className={`${styles.roleBadge} ${cls}`}>{t(`family.roles.${role}`)}</span>
}

// ── Composant édition description/discord ─────────────────────
function EditInfoSection({ family, t, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [desc,    setDesc]    = useState(family.description ?? '')
  const [discord, setDiscord] = useState(family.discord_url ?? '')
  const [saving,  setSaving]  = useState(false)

  async function handleSave() {
    setSaving(true)
    await supabase.from('families').update({
      description: desc.trim() || null,
      discord_url: discord.trim() || null,
    }).eq('id', family.id)
    setSaving(false)
    setEditing(false)
    await onSaved()
  }

  if (!editing) {
    return (
      <div className={styles.infoSection}>
        {family.description && <p className={styles.description}>{family.description}</p>}
        {family.discord_url && (
          <a href={family.discord_url} target="_blank" rel="noopener noreferrer" className={styles.discordBtn}>
            🎮 {t('familyDetail.discord')}
          </a>
        )}
        <button
          className={styles.btnEditInfo}
          onClick={() => { setDesc(family.description ?? ''); setDiscord(family.discord_url ?? ''); setEditing(true) }}
        >
          ✎ {t('family.editInfoBtn')}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.infoSection}>
      <textarea
        className={styles.createTextarea}
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder={t('family.descPh')}
        rows={3}
        maxLength={300}
        disabled={saving}
      />
      <input
        className={styles.createInput}
        value={discord}
        onChange={e => setDiscord(e.target.value)}
        placeholder={t('family.discordUrlPh')}
        disabled={saving}
      />
      <div className={styles.infoActions}>
        <Button variant="solid" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? '…' : t('family.saveInfo')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
          {t('session.cancel')}
        </Button>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function FamilyDetailPage() {
  const { familyId } = useParams()
  const { user }     = useAuth()
  const { t, lang }  = useLang()
  const navigate     = useNavigate()

  const [family,   setFamily]   = useState(null)
  const [members,  setMembers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Gestion
  const [myFreeChars,    setMyFreeChars]    = useState([])
  const [friends,        setFriends]        = useState([])
  const [friendFamilyIds,setFriendFamilyIds]= useState(new Set())
  const [invitedIds,     setInvitedIds]     = useState(new Set())
  const [editingLevel,   setEditingLevel]   = useState(false)
  const [levelInput,     setLevelInput]     = useState(1)
  const [confirm,        setConfirm]        = useState(null)

  // Demandes d'adhésion
  const [joinRequests,    setJoinRequests]    = useState([])

  // Rejoindre la famille (non-membres)
  const [joinChars,       setJoinChars]       = useState([])
  const [joinPickCharId,  setJoinPickCharId]  = useState(null)
  const [joinSent,        setJoinSent]        = useState(false)
  const [joinSending,     setJoinSending]     = useState(false)
  const [joinError,       setJoinError]       = useState(null)

  // Recrutement
  const [recruitTags,     setRecruitTags]     = useState([])
  const [recruitOpen,     setRecruitOpen]     = useState(false)
  const [recruitMinLevel, setRecruitMinLevel] = useState('')
  const [recruitSaving,   setRecruitSaving]   = useState(false)

  // ── Chargement ────────────────────────────────────────────────

  useEffect(() => {
    if (!hasSupabase) { setLoading(false); setNotFound(true); return }
    loadFamily()
  }, [familyId])

  async function loadFamily() {
    setLoading(true)
    const [{ data: fam, error }, { data: mems }] = await Promise.all([
      supabase.from('families')
        .select('id, name, level, server, description, discord_url, created_at, head_id, tags, recruiting, min_level, profiles!head_id(username)')
        .eq('id', familyId)
        .single(),
      supabase.from('family_members')
        .select('id, role, joined_at, character_id, profile_id, characters(id, name, class), profiles(id, username)')
        .eq('family_id', familyId)
        .order('joined_at', { ascending: true }),
    ])
    if (error || !fam) {
      setNotFound(true)
    } else {
      setFamily(fam)
      setRecruitTags(fam.tags ?? [])
      setRecruitOpen(fam.recruiting ?? false)
      setRecruitMinLevel(fam.min_level ?? '')
    }
    setMembers(mems ?? [])
    setLoading(false)
  }

  // ── Données de gestion ────────────────────────────────────────

  // isHead / isAssistant dérivés après chargement
  const isHead      = !!(user?.id && family?.head_id === user.id)
  const isAssistant = !isHead && members.some(m => m.profile_id === user?.id && m.role === 'assistant')
  const isManaging  = isHead || isAssistant
  const myMember    = members.find(m => m.profile_id === user?.id && (m.role === 'head' || m.role === 'assistant'))
                   ?? members.find(m => m.profile_id === user?.id)

  useEffect(() => {
    if (!isManaging || !user?.id || !hasSupabase) return
    loadManagementData()
    loadJoinRequests()
  }, [isManaging, user?.id])

  useEffect(() => {
    if (!family || !user?.id || myMember || !family.recruiting || !hasSupabase) return
    loadJoinChars()
  }, [family?.id, user?.id, myMember])

  async function loadManagementData() {
    // Personnages libres (pas encore dans une famille)
    const { data: allChars } = await supabase
      .from('characters')
      .select('id, name, class')
      .eq('profile_id', user.id)
      .order('sort_order')
    const allCharIds = (allChars ?? []).map(c => c.id)
    if (allCharIds.length > 0) {
      const { data: existingMems } = await supabase
        .from('family_members')
        .select('character_id')
        .in('character_id', allCharIds)
      const usedIds = new Set((existingMems ?? []).map(m => m.character_id))
      setMyFreeChars((allChars ?? []).filter(c => !usedIds.has(c.id)))
    } else {
      setMyFreeChars([])
    }

    // Amis invitables
    const { data: friendRows } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    if (!friendRows || friendRows.length === 0) { setFriends([]); return }
    const friendIds = friendRows.map(r => r.requester_id === user.id ? r.addressee_id : r.requester_id)
    const [{ data: profiles }, { data: fmRows }] = await Promise.all([
      supabase.from('profiles').select('id, username').in('id', friendIds),
      supabase.from('family_members').select('profile_id').in('profile_id', friendIds),
    ])
    setFriendFamilyIds(new Set((fmRows ?? []).map(m => m.profile_id)))
    setFriends(profiles ?? [])
  }

  async function loadJoinChars() {
    const { data: allChars } = await supabase
      .from('characters')
      .select('id, name, class, hero_level, server')
      .eq('profile_id', user.id)
    const eligible = (allChars ?? []).filter(c =>
      c.server === family.server &&
      (family.min_level == null || (c.hero_level ?? 0) >= family.min_level)
    )
    if (eligible.length === 0) { setJoinChars([]); return }
    const { data: existing } = await supabase
      .from('family_members')
      .select('character_id')
      .in('character_id', eligible.map(c => c.id))
    const usedIds = new Set((existing ?? []).map(m => m.character_id))
    const free = eligible.filter(c => !usedIds.has(c.id))
    setJoinChars(free)
    if (free.length > 0 && !joinPickCharId) setJoinPickCharId(free[0].id)
  }

  async function handleJoinRequest() {
    if (!joinPickCharId) return
    setJoinSending(true)
    setJoinError(null)
    const { error } = await supabase.rpc('request_join_family', {
      p_family_id:    familyId,
      p_character_id: joinPickCharId,
    })
    setJoinSending(false)
    if (error) {
      const msg = error.message ?? ''
      if (msg.includes('not_recruiting'))          setJoinError(t('familiesList.errNotRecruiting'))
      else if (msg.includes('already_in_family'))  setJoinError(t('familiesList.errAlreadyInFamily'))
      else if (msg.includes('request_already_sent')) setJoinError(t('familiesList.errRequestSent'))
      else if (msg.includes('request_cooldown'))   setJoinError(t('familiesList.errRequestCooldown'))
      else setJoinError(t('familiesList.errJoinRequest'))
    } else {
      setJoinSent(true)
    }
  }

  async function loadJoinRequests() {
    const { data } = await supabase
      .from('family_join_requests')
      .select('id, character_id, profile_id, created_at, characters(name, class), profiles(username)')
      .eq('family_id', familyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setJoinRequests(data ?? [])
  }

  // ── Actions de gestion ────────────────────────────────────────

  async function handleChangeRole(member, newRole) {
    if (newRole === 'head') {
      const headMem = members.find(m => m.profile_id === user.id && m.role === 'head')
      await supabase.from('family_members').update({ role: 'head' }).eq('id', member.id)
      await supabase.from('families').update({ head_id: member.profile_id }).eq('id', familyId)
      if (headMem) await supabase.from('family_members').update({ role: 'assistant' }).eq('id', headMem.id)
      await loadFamily()
    } else {
      await supabase.from('family_members').update({ role: newRole }).eq('id', member.id)
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m))
    }
  }

  function askKick(member) {
    setConfirm({
      message: t('family.kickConfirm'),
      onConfirm: async () => {
        setConfirm(null)
        await supabase.from('family_members').delete().eq('id', member.id)
        setMembers(prev => prev.filter(m => m.id !== member.id))
      },
    })
  }

  async function handleFamilyRequest(requestId, action) {
    const { error } = await supabase.rpc('handle_family_request', {
      p_request_id: requestId,
      p_action:     action,
    })
    if (!error) {
      setJoinRequests(prev => prev.filter(r => r.id !== requestId))
      if (action === 'accept') await loadFamily()
    }
  }

  async function handleInvite(friend) {
    if (!family) return
    await supabase.from('notifications').insert({
      user_id:         friend.id,
      type:            'family_invite',
      content_preview: family.name,
      related_user_id: user.id,
      family_id:       familyId,
    })
    setInvitedIds(prev => new Set([...prev, friend.id]))
  }

  async function handleAddMyChar(char) {
    const { error } = await supabase.from('family_members').insert({
      family_id:    familyId,
      character_id: char.id,
      profile_id:   user.id,
      role:         'member',
    })
    if (!error) {
      await loadFamily()
      await loadManagementData()
    }
  }

  async function handleSaveLevel() {
    const lvl = Math.min(30, Math.max(1, levelInput))
    await supabase.from('families').update({ level: lvl }).eq('id', familyId)
    setEditingLevel(false)
    await loadFamily()
  }

  async function handleSaveRecruiting() {
    setRecruitSaving(true)
    const minLvl = recruitMinLevel === '' ? null : Math.max(1, parseInt(recruitMinLevel, 10) || 1)
    await supabase.from('families').update({
      tags:       recruitTags,
      recruiting: recruitOpen,
      min_level:  minLvl,
    }).eq('id', familyId)
    setRecruitSaving(false)
  }

  function askLeaveOrDissolve() {
    if (!myMember) return
    const isHeadLeaving = myMember.role === 'head'
    setConfirm({
      message: isHeadLeaving ? t('family.dissolveConfirm') : t('family.leaveConfirm'),
      onConfirm: async () => {
        setConfirm(null)
        if (isHeadLeaving) {
          await supabase.from('families').delete().eq('id', familyId)
        } else {
          await supabase.from('family_members').delete().eq('id', myMember.id)
        }
        navigate('/family')
      },
    })
  }

  // ── Rendu ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} style={{ height: 120, borderRadius: 12 }} />
        <div className={styles.skeleton} style={{ height: 200, borderRadius: 12 }} />
      </div>
    )
  }

  if (notFound || !family) {
    return (
      <div className={styles.page}>
        <Link to="/families" className={styles.backLink}>← {t('familyDetail.back')}</Link>
        <p className={styles.notFound}>{t('familyDetail.notFound')}</p>
      </div>
    )
  }

  const levelColor     = getLevelColor(family.level)
  const sortedMembers  = [...members].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))
  const invitableFriends = friends.filter(f => !friendFamilyIds.has(f.id))

  return (
    <div className={styles.page}>

      {/* Navigation */}
      <Link to="/families" className={styles.backLink}>{t('familyDetail.back')}</Link>

      {/* Header */}
      <div className={styles.header} style={{ '--accent': levelColor }}>
        <div className={styles.headerBg} />
        <div className={styles.headerContent}>
          <h1 className={styles.familyName} style={{ color: levelColor, textShadow: `0 0 24px ${levelColor}88` }}>
            🏠 {family.name}
          </h1>
          <div className={styles.badges}>
            {/* Niveau — cliquable pour la tête */}
            {isHead && editingLevel ? (
              <div className={styles.levelEditRow}>
                <input
                  type="number" min="1" max="30"
                  className={styles.levelInput}
                  value={levelInput}
                  onChange={e => setLevelInput(Number(e.target.value))}
                />
                <button className={styles.btnSaveLevel} onClick={handleSaveLevel}>✓</button>
                <button className={styles.btnCancelLevel} onClick={() => setEditingLevel(false)}>✕</button>
              </div>
            ) : (
              <span
                className={styles.lvlBadge}
                style={{ borderColor: levelColor, color: levelColor, cursor: isHead ? 'pointer' : 'default' }}
                title={isHead ? t('family.editLevelHint') : undefined}
                onClick={isHead ? () => { setLevelInput(family.level); setEditingLevel(true) } : undefined}
              >
                {t('family.level')} {family.level}{isHead && ' ✎'}
              </span>
            )}
            <span className={styles.serverBadge}>
              {t(`raids.server.${family.server ?? 'undercity'}`)}
            </span>
            <span className={styles.memberCount}>
              {members.length} {t('family.members')}
            </span>
          </div>
          <div className={styles.headLine}>
            {t('familyDetail.head')} :{' '}
            <Link to={`/players/${family.profiles?.username ?? ''}`} className={styles.headLink}>
              {family.profiles?.username ?? '—'}
            </Link>
          </div>
        </div>
      </div>

      {/* Description + Discord */}
      {isHead ? (
        <div className={styles.infoCard}>
          <EditInfoSection family={family} t={t} onSaved={loadFamily} />
        </div>
      ) : (family.description || family.discord_url) ? (
        <div className={styles.infoCard}>
          {family.description && (
            <p className={styles.description}>{family.description}</p>
          )}
          {family.discord_url && (
            <a href={family.discord_url} target="_blank" rel="noopener noreferrer" className={styles.discordBtn}>
              🎮 {t('familyDetail.discord')}
            </a>
          )}
        </div>
      ) : null}

      {/* Membres */}
      <div className={styles.membersCard}>
        <h2 className={styles.sectionTitle}>{t('family.membersTitle')}</h2>
        <div className={styles.memberList}>
          {sortedMembers.map(m => {
            const charCls  = CLASSES[m.characters?.class] ?? CLASSES.Archer
            const roleColors = { head: '#ffcc00', assistant: '#4499ff', guardian: '#5dc85d', member: '#6a6a8a' }
            const roleColor  = roleColors[m.role] ?? '#6a6a8a'
            const isMe       = m.profile_id === user?.id
            const charName   = m.characters?.name ?? '—'
            const uname      = m.profiles?.username ?? '—'

            const canKick = isManaging && !isMe && (
              (isHead && m.role !== 'head') ||
              (isAssistant && (m.role === 'guardian' || m.role === 'member'))
            )
            const actions = []
            if (isManaging && !isMe) {
              if (isHead && m.role !== 'head') {
                if (m.role !== 'assistant') actions.push({ label: t('family.makeAssistant'), role: 'assistant' })
                if (m.role !== 'guardian')  actions.push({ label: t('family.makeGuardian'),  role: 'guardian' })
                if (m.role !== 'member')    actions.push({ label: t('family.makeMember'),    role: 'member' })
                if (m.role === 'assistant') actions.push({ label: t('family.makeHead'),      role: 'head' })
              }
              if (isAssistant && m.role === 'member')   actions.push({ label: t('family.makeGuardian'), role: 'guardian' })
              if (isAssistant && m.role === 'guardian') actions.push({ label: t('family.makeMember'),   role: 'member' })
            }

            return (
              <div key={m.id} className={styles.memberRow}>
                <span className={styles.roleDot} style={{ background: roleColor }} />
                <div className={styles.memberInfo}>
                  <div className={styles.memberNameRow}>
                    <span className={styles.memberUsername} style={{ color: charCls.color }}>
                      {charCls.icon} {charName}
                    </span>
                    {isMe && <span className={styles.youBadge}>{t('family.you')}</span>}
                  </div>
                  <div className={styles.memberMeta}>
                    <Link to={`/players/${uname}`} className={styles.memberChar}>
                      🗡 {uname}
                    </Link>
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
      </div>

      {/* Demandes d'adhésion (tête / assistant) */}
      {isManaging && (
        <div className={styles.manageSection}>
          <h3 className={styles.panelTitle}>
            {t('family.joinRequestsTitle')}
            {joinRequests.length > 0 && (
              <span className={styles.requestBadge}>{joinRequests.length}</span>
            )}
          </h3>
          {joinRequests.length === 0 ? (
            <p className={styles.emptySmall}>{t('family.joinRequestsEmpty')}</p>
          ) : (
            <div className={styles.inviteList}>
              {joinRequests.map(r => {
                const charCls  = CLASSES[r.characters?.class] ?? CLASSES.Archer
                const charName = r.characters?.name ?? '—'
                const uname    = r.profiles?.username ?? '—'
                return (
                  <div key={r.id} className={styles.joinRequestRow}>
                    <div className={styles.joinRequestInfo}>
                      <span className={styles.inviteName} style={{ color: charCls.color }}>
                        {charCls.icon} {charName}
                      </span>
                      <span className={styles.joinRequestPlayer}>
                        🗡 {uname}
                      </span>
                    </div>
                    <div className={styles.joinRequestActions}>
                      <button
                        className={styles.btnInvite}
                        onClick={() => handleFamilyRequest(r.id, 'accept')}
                      >
                        {t('family.joinRequestAccept')}
                      </button>
                      <button
                        className={styles.btnKick}
                        onClick={() => handleFamilyRequest(r.id, 'decline')}
                      >
                        {t('family.joinRequestDecline')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Inviter des amis */}
      {isManaging && (
        <div className={styles.manageSection}>
          <h3 className={styles.panelTitle}>{t('family.inviteTitle')}</h3>
          {invitableFriends.length === 0 ? (
            <p className={styles.emptySmall}>{t('family.inviteEmpty')}</p>
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
        </div>
      )}

      {/* Ajouter mes autres personnages */}
      {isManaging && myFreeChars.length > 0 && (
        <div className={styles.manageSection}>
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
        </div>
      )}

      {/* Recrutement (tête uniquement) */}
      {isHead && (
        <div className={styles.manageSection}>
          <h3 className={styles.panelTitle}>{t('family.recruitingTitle')}</h3>

          <label className={styles.recruitToggle}>
            <input
              type="checkbox"
              checked={recruitOpen}
              onChange={e => setRecruitOpen(e.target.checked)}
            />
            {t('family.recruiting')}
          </label>

          <div className={styles.recruitRow}>
            <span className={styles.recruitLabel}>{t('family.minLevelLabel')}</span>
            <input
              type="number"
              min="1"
              className={styles.levelInput}
              value={recruitMinLevel}
              onChange={e => setRecruitMinLevel(e.target.value)}
              placeholder={t('family.minLevelPh')}
              style={{ width: 70 }}
            />
          </div>

          <div className={styles.tagsGrid}>
            {FAMILY_TAGS.map(tag => (
              <label key={tag.slug} className={styles.tagCheckbox}>
                <input
                  type="checkbox"
                  checked={recruitTags.includes(tag.slug)}
                  onChange={e => {
                    setRecruitTags(prev =>
                      e.target.checked
                        ? [...prev, tag.slug]
                        : prev.filter(s => s !== tag.slug)
                    )
                  }}
                />
                {t(`family.tags.${tag.slug}`)}
              </label>
            ))}
          </div>

          <button
            className={styles.btnSaveRecruit}
            onClick={handleSaveRecruiting}
            disabled={recruitSaving}
          >
            {recruitSaving ? '…' : t('family.saveRecruiting')}
          </button>
        </div>
      )}

      {/* Rejoindre la famille (non-membre, recrutement ouvert) */}
      {user && !myMember && family.recruiting && (
        <div className={styles.joinSection}>
          {joinSent ? (
            <p className={styles.joinSentMsg}>✓ {t('familiesList.joinRequestSent')}</p>
          ) : joinChars.length === 0 ? (
            <p className={styles.joinNoChar}>
              {family.min_level != null
                ? t('familiesList.noCharForLevel', { n: family.min_level })
                : t('familiesList.noCharForServer')}
            </p>
          ) : (
            <div className={styles.joinRow}>
              <select
                className={styles.joinSelect}
                value={joinPickCharId ?? ''}
                onChange={e => setJoinPickCharId(e.target.value)}
              >
                {joinChars.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.hero_level ? ` (H${c.hero_level})` : ''}
                  </option>
                ))}
              </select>
              <button
                className={styles.btnJoin}
                onClick={handleJoinRequest}
                disabled={joinSending || !joinPickCharId}
              >
                {joinSending ? '…' : t('familiesList.joinRequest')}
              </button>
            </div>
          )}
          {joinError && <p className={styles.joinError}>{joinError}</p>}
        </div>
      )}

      {/* Quitter / Dissoudre */}
      {myMember && (
        <div className={styles.leaveSection}>
          <button
            className={myMember.role === 'head' ? styles.btnDissolve : styles.btnLeave}
            onClick={askLeaveOrDissolve}
          >
            {myMember.role === 'head' ? t('family.dissolveBtn') : t('family.leaveBtn')}
          </button>
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
