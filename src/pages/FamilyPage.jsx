// ============================================================
// FamilyPage — Gestion de la famille NosTale
// Rôles : Tête > Assistant > Gardien > Membre
// ============================================================
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import styles from './FamilyPage.module.css'

// ── Couleurs de niveau famille (progression NosTale) ─────────
const LEVEL_COLORS = [
  { max: 3,  color: '#a0a0a0' }, // Niveaux 1-3   : gris
  { max: 6,  color: '#5dc85d' }, // Niveaux 4-6   : vert
  { max: 10, color: '#4499ff' }, // Niveaux 7-10  : bleu
  { max: 14, color: '#bb44ff' }, // Niveaux 11-14 : violet
  { max: 18, color: '#ff8833' }, // Niveaux 15-18 : orange
  { max: 22, color: '#ff3333' }, // Niveaux 19-22 : rouge
  { max: 26, color: '#ff66aa' }, // Niveaux 23-26 : rose
  { max: 30, color: '#ffcc00' }, // Niveaux 27-30 : or
]

function getLevelColor(level) {
  return (LEVEL_COLORS.find(b => level <= b.max) ?? LEVEL_COLORS[LEVEL_COLORS.length - 1]).color
}

// ── Ordre d'affichage des rôles ───────────────────────────────
const ROLE_ORDER = { head: 0, assistant: 1, guardian: 2, member: 3 }

// ── Composant badge de rôle ───────────────────────────────────
function RoleBadge({ role, t }) {
  const cls = {
    head:      styles.roleHead,
    assistant: styles.roleAssistant,
    guardian:  styles.roleGuardian,
    member:    styles.roleMember,
  }[role] ?? styles.roleMember

  return (
    <span className={`${styles.roleBadge} ${cls}`}>
      {t(`family.roles.${role}`)}
    </span>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function FamilyPage() {
  const { user, isAuthenticated } = useAuth()
  const { t, lang } = useLang()

  const [loading,    setLoading]    = useState(true)
  const [membership, setMembership] = useState(null) // { family, role, memberId }
  const [members,    setMembers]    = useState([])
  const [friends,    setFriends]    = useState([])   // amis sans famille
  const [friendFamilies, setFriendFamilies] = useState(new Set()) // IDs amis avec famille

  // Formulaire création
  const [createName,    setCreateName]    = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createErr,     setCreateErr]     = useState(null)

  // Feedback invitation
  const [invitedIds, setInvitedIds] = useState(new Set())

  // Confirmation d'action
  const [confirm, setConfirm] = useState(null) // { message, onConfirm }

  // ── Chargement ───────────────────────────────────────────────

  useEffect(() => {
    if (!hasSupabase || !user?.id) { setLoading(false); return }
    loadAll()
  }, [user?.id])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadMembership(), loadFriends()])
    setLoading(false)
  }

  async function loadMembership() {
    const { data } = await supabase
      .from('family_members')
      .select('id, role, family_id, families(id, name, level, head_id)')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (data?.families) {
      setMembership({ family: data.families, role: data.role, memberId: data.id })
      await loadMembers(data.families.id)
    } else {
      setMembership(null)
      setMembers([])
    }
  }

  async function loadMembers(familyId) {
    const { data } = await supabase
      .from('family_members')
      .select('id, role, profile_id, joined_at, profiles(username, avatar_url)')
      .eq('family_id', familyId)
      .order('joined_at')
    setMembers(data ?? [])
  }

  async function loadFriends() {
    // Récupère les amis acceptés
    const { data: rows } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    if (!rows || rows.length === 0) { setFriends([]); return }

    const friendIds = rows.map(r => r.requester_id === user.id ? r.addressee_id : r.requester_id)

    const [{ data: profiles }, { data: fmRows }] = await Promise.all([
      supabase.from('profiles').select('id, username, avatar_url').in('id', friendIds),
      supabase.from('family_members').select('profile_id').in('profile_id', friendIds),
    ])

    setFriendFamilies(new Set((fmRows ?? []).map(m => m.profile_id)))
    setFriends(profiles ?? [])
  }

  // ── Créer une famille ─────────────────────────────────────────

  async function handleCreate(e) {
    e.preventDefault()
    const name = createName.trim()
    if (!name) { setCreateErr(t('family.errNameRequired')); return }

    setCreateLoading(true)
    setCreateErr(null)

    const { data: fam, error } = await supabase
      .from('families')
      .insert({ name, head_id: user.id })
      .select()
      .single()

    if (error) {
      setCreateErr(error.code === '23505' ? t('family.errNameTaken') : t('family.errCreate'))
      setCreateLoading(false)
      return
    }

    await supabase.from('family_members').insert({
      family_id: fam.id,
      profile_id: user.id,
      role: 'head',
    })

    setCreateLoading(false)
    await loadAll()
  }

  // ── Quitter ───────────────────────────────────────────────────

  function askLeave() {
    if (membership.role === 'head' && members.length > 1) {
      setCreateErr(t('family.leaveHeadError'))
      return
    }
    setConfirm({
      message: t('family.leaveConfirm'),
      onConfirm: async () => {
        setConfirm(null)
        if (membership.role === 'head') {
          // Seul membre restant : supprimer la famille
          await supabase.from('families').delete().eq('id', membership.family.id)
        } else {
          await supabase.from('family_members').delete().eq('id', membership.memberId)
        }
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
        setMembers(prev => prev.filter(m => m.id !== member.id))
      },
    })
  }

  // ── Changer de rôle ───────────────────────────────────────────

  async function handleChangeRole(member, newRole) {
    if (newRole === 'head') {
      // Ordre : 1) target → head, 2) families.head_id, 3) moi → assistant
      await supabase.from('family_members')
        .update({ role: 'head' }).eq('id', member.id)
      await supabase.from('families')
        .update({ head_id: member.profile_id }).eq('id', membership.family.id)
      await supabase.from('family_members')
        .update({ role: 'assistant' }).eq('profile_id', user.id).eq('family_id', membership.family.id)
      await loadAll()
    } else {
      await supabase.from('family_members').update({ role: newRole }).eq('id', member.id)
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m))
    }
  }

  // ── Inviter un ami ────────────────────────────────────────────

  async function handleInvite(friend) {
    await supabase.from('notifications').insert({
      user_id:         friend.id,
      type:            'family_invite',
      content_preview: membership.family.name,
      related_user_id: user.id,
      family_id:       membership.family.id,
    })
    setInvitedIds(prev => new Set([...prev, friend.id]))
  }

  // ── Rendu : non connecté ──────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>🏠 {t('family.title')}</h1>
        <p className={styles.empty}>
          <Link to="/auth?mode=login">{t('nav.signIn')}</Link>
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} style={{ height: 120, borderRadius: 12 }} />
      </div>
    )
  }

  // ── Rendu : sans famille ──────────────────────────────────────

  if (!membership) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>🏠 {t('family.title')}</h1>

        <div className={styles.noFamilyCard}>
          <p className={styles.noFamilyText}>{t('family.noFamily')}</p>
          <p className={styles.noFamilySub}>{t('family.noFamilySub')}</p>

          <form className={styles.createForm} onSubmit={handleCreate}>
            <h2 className={styles.sectionTitle}>{t('family.createTitle')}</h2>
            <div className={styles.createRow}>
              <input
                className={styles.createInput}
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                placeholder={t('family.createNamePh')}
                maxLength={30}
                disabled={createLoading}
              />
              <Button variant="solid" size="sm" type="submit" disabled={createLoading}>
                {createLoading ? t('family.creating') : t('family.createBtn')}
              </Button>
            </div>
            {createErr && <p className={styles.err}>{createErr}</p>}
          </form>
        </div>
      </div>
    )
  }

  // ── Rendu : dans une famille ──────────────────────────────────

  const { family, role } = membership
  const levelColor = getLevelColor(family.level)
  const isHead      = role === 'head'
  const isAssistant = role === 'assistant'
  const canManage   = isHead || isAssistant

  const sortedMembers = [...members].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
  )

  // Amis invitables : pas encore dans une famille
  const invitableFriends = friends.filter(f => !friendFamilies.has(f.id))

  return (
    <div className={styles.page}>

      {/* En-tête famille */}
      <div className={styles.familyHeader}>
        <div className={styles.familyMeta}>
          <h1 className={styles.familyName} style={{ color: levelColor }}>
            🏠 {family.name}
          </h1>
          <span className={styles.familyLevel} style={{ borderColor: levelColor, color: levelColor }}>
            {t('family.level')} {family.level}
          </span>
        </div>
        <div className={styles.familyStats}>
          <span className={styles.memberCount}>
            {members.length} {t('family.members')}
          </span>
          <RoleBadge role={role} t={t} />
        </div>
        <button className={styles.leaveBtn} onClick={askLeave}>
          {t('family.leaveBtn')}
        </button>
        {createErr && <p className={styles.err}>{createErr}</p>}
      </div>

      {/* Liste des membres */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('family.membersTitle')}</h2>
        <div className={styles.memberList}>
          {sortedMembers.map(m => {
            const isMe     = m.profile_id === user.id
            const username = m.profiles?.username ?? '—'

            // Actions disponibles selon le rôle de l'utilisateur et le rôle du membre
            const canKick = !isMe && isHead && m.role !== 'head'
            const actions = []
            if (!isMe && isHead && m.role !== 'head') {
              if (m.role !== 'assistant') actions.push({ label: t('family.makeAssistant'), role: 'assistant' })
              if (m.role !== 'guardian')  actions.push({ label: t('family.makeGuardian'),  role: 'guardian'  })
              if (m.role !== 'member')    actions.push({ label: t('family.makeMember'),     role: 'member'    })
              actions.push({ label: t('family.makeHead'), role: 'head' })
            }
            if (!isMe && isAssistant && m.role === 'member') {
              actions.push({ label: t('family.makeGuardian'), role: 'guardian' })
            }
            if (!isMe && isAssistant && m.role === 'guardian') {
              actions.push({ label: t('family.makeMember'), role: 'member' })
            }

            return (
              <div key={m.id} className={styles.memberCard}>
                <div className={styles.memberAvatar}>
                  {m.profiles?.avatar_url
                    ? <img src={m.profiles.avatar_url} alt="" className={styles.avatarImg} />
                    : <span className={styles.avatarFallback}>👤</span>
                  }
                </div>
                <div className={styles.memberInfo}>
                  <div className={styles.memberNameRow}>
                    <Link to={`/players/${username}`} className={styles.memberName}>
                      {username}
                    </Link>
                    {isMe && <span className={styles.youBadge}>{t('family.you')}</span>}
                  </div>
                  <div className={styles.memberMeta}>
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
                      >
                        {a.label}
                      </button>
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
      </section>

      {/* Panneau d'invitation (tête ou assistant) */}
      {canManage && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('family.inviteTitle')}</h2>
          {invitableFriends.length === 0 ? (
            <p className={styles.empty}>{t('family.inviteEmpty')}</p>
          ) : (
            <div className={styles.inviteList}>
              {invitableFriends.map(f => {
                const sent = invitedIds.has(f.id)
                return (
                  <div key={f.id} className={styles.inviteRow}>
                    <div className={styles.memberAvatar}>
                      {f.avatar_url
                        ? <img src={f.avatar_url} alt="" className={styles.avatarImg} />
                        : <span className={styles.avatarFallback}>👤</span>
                      }
                    </div>
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
        </section>
      )}

      {/* Modal de confirmation */}
      {confirm && (
        <div className={styles.confirmOverlay} onClick={() => setConfirm(null)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <p className={styles.confirmMsg}>{confirm.message}</p>
            <div className={styles.confirmActions}>
              <Button variant="solid" size="sm" onClick={confirm.onConfirm}>
                OK
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirm(null)}>
                {t('session.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
