import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCharacters } from '@/hooks/useCharacters'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import { RAIDS } from '@/lib/raids'
import { CLASSES, WEAPON_RARITIES, SHELL_EFFECTS, SHELL_RANK_COLORS, RUNIC_EFFECTS, RUNIC_COLOR } from '@/lib/mockData'
import Button from '@/components/ui/Button'
import styles from './RaidSessionDetailPage.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(dateStr, lang) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-US',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  )
}

// ── SessionHeader ─────────────────────────────────────────────────────────────

function computeEndTime(timeStr, durationMinutes) {
  if (!timeStr || !durationMinutes) return null
  const [h, m] = timeStr.split(':').map(Number)
  const total  = h * 60 + m + durationMinutes
  const eh = Math.floor(total / 60) % 24
  const em = total % 60
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

function fmtDuration(minutes) {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m)  return `${h}h${String(m).padStart(2, '0')}`
  if (h)       return `${h}h`
  return `${m}min`
}

const SERVER_COLORS_DETAIL = { undercity: '#7c6ce0', dragonveil: '#e06c5a' }

const OG_BASE    = 'https://nos-book.vercel.app/api/og-session'
const OG_IMG_BASE = 'https://gdwdayxfblmfbjtxybtv.supabase.co/functions/v1/og-session'

function SessionHeader({ session, raid, lang, t, regCount }) {
  const dateStr  = fmtDate(session.date, lang)
  const timeStr  = session.time ? session.time.slice(0, 5) : t('session.noTime')
  const endTime  = computeEndTime(session.time, session.duration_minutes)
  const duration = fmtDuration(session.duration_minutes)
  const [copied, setCopied]   = useState(false)
  const [sharing, setSharing] = useState(false)

  const handleShare = async () => {
    setSharing(true)
    // Pré-génère l'image en Storage pour que Discord la fetche instantanément
    await fetch(`${OG_IMG_BASE}?id=${session.id}&img=1`).catch(() => {})
    await navigator.clipboard.writeText(`${OG_BASE}?id=${session.id}`)
    setSharing(false)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.header} style={{ '--raid-color': raid.color }}>
      <div className={styles.headerAccent} />
      <div className={styles.headerMain}>
        <img
          src={`https://nosapki.com/images/icons/${raid.icon}.png`}
          alt=""
          className={styles.headerIcon}
        />
        <div className={styles.headerInfo}>
          <h1 className={styles.headerTitle}>{raid[lang] ?? raid.en}</h1>
          <p className={styles.headerDate}>
            {dateStr} · {timeStr}
            {endTime && <span className={styles.headerEndTime}> → {endTime}</span>}
            {duration && <span className={styles.headerDuration}> ({duration})</span>}
          </p>
          {session.comments && (
            <p className={styles.headerComments}>{session.comments}</p>
          )}
        </div>
      </div>
      <div className={styles.headerBadges}>
        {session.server && (
          <span className={styles.badge} style={{ color: SERVER_COLORS_DETAIL[session.server], borderColor: SERVER_COLORS_DETAIL[session.server] + '55' }}>
            ● {session.server === 'undercity' ? 'Undercity' : 'Dragonveil'}
          </span>
        )}
        {session.leader_username && (
          <span className={styles.badge}>👑 {session.leader_username}</span>
        )}
        {session.min_level > 0 && (
          <span className={styles.badge}>⚔️ {t('detail.minLevel')} H{session.min_level}</span>
        )}
        <span className={styles.badge}>👥 {regCount} / {session.max_players} {t('detail.players')}</span>
        <span className={styles.badge}>🎭 {session.max_chars_per_person} {t('session.charsPerPlayer')}</span>
        {session.teams?.length > 1 && (
          <span className={styles.badge}>🏴 {session.teams.length} {t('detail.teams')}</span>
        )}
      </div>
      <button className={styles.shareBtn} onClick={handleShare} disabled={sharing}>
        {sharing ? '⏳' : copied ? '✓' : '🔗'} {sharing ? t('session.shareGenerating') : copied ? t('session.shareCopied') : t('session.shareBtn')}
      </button>
    </div>
  )
}

// ── CharacterCard ─────────────────────────────────────────────────────────────

function CharacterCard({
  reg, isLeader, isOwn,
  onAssignSP, onRemoveFromTeam, onClick,
  draggable, onDragStart,
}) {
  const snap = reg.character_snapshot ?? {}
  const cls  = CLASSES[snap.class]

  return (
    <div
      className={`${styles.charCard} ${isOwn ? styles.charCardOwn : ''} ${onClick ? styles.charCardClickable : ''}`}
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart(e, reg.id) : undefined}
      onClick={onClick ? () => onClick(reg) : undefined}
    >
      <span className={styles.charClass} style={{ color: cls?.color }}>
        {cls?.icon ?? '?'}
      </span>
      <div className={styles.charInfo}>
        <span className={styles.charName}>{snap.name}</span>
        <span className={styles.charLevel}>
          Lv.{snap.level}{snap.heroLevel > 0 ? ` · H${snap.heroLevel}` : ''}
        </span>
      </div>

      {isLeader && reg.team_name && (
        <button
          className={styles.charBtn}
          onClick={e => { e.stopPropagation(); onAssignSP(reg) }}
          title="Attribuer une carte SP"
        >
          🎴
        </button>
      )}
      {isLeader && reg.team_name && (
        <button
          className={`${styles.charBtn} ${styles.charBtnRemove}`}
          onClick={e => { e.stopPropagation(); onRemoveFromTeam(reg.id) }}
          title="Retirer de l'équipe"
        >
          ✕
        </button>
      )}
    </div>
  )
}

// ── TeamSlot ──────────────────────────────────────────────────────────────────

function TeamSlot({ reg, isLeader, onAssignSP, onRemoveFromTeam, onDragStart, onClick }) {
  const snap = reg.character_snapshot ?? {}
  const cls  = CLASSES[snap.class]

  return (
    <div
      className={`${styles.teamSlot} ${onClick ? styles.charCardClickable : ''}`}
      draggable={isLeader}
      onDragStart={isLeader ? (e) => onDragStart(e, reg.id) : undefined}
      onClick={onClick ? () => onClick(reg) : undefined}
    >
      {reg.sp_card_icon ? (
        <img src={reg.sp_card_icon} alt="" className={styles.teamSlotSPIcon} />
      ) : (
        <span className={styles.teamSlotClassIcon} style={{ color: cls?.color }}>
          {cls?.icon ?? '?'}
        </span>
      )}
      <div className={styles.teamSlotInfo}>
        <span className={styles.teamSlotName}>{snap.name}</span>
        {reg.player_username && (
          <span className={styles.teamSlotPlayer}>{reg.player_username}</span>
        )}
      </div>
      {isLeader && (
        <>
          <button
            className={styles.charBtn}
            onClick={e => { e.stopPropagation(); onAssignSP(reg) }}
            title="Attribuer une carte SP"
          >🎴</button>
          <button
            className={`${styles.charBtn} ${styles.charBtnRemove}`}
            onClick={e => { e.stopPropagation(); onRemoveFromTeam(reg.id) }}
            title="Retirer de l'équipe"
          >✕</button>
        </>
      )}
    </div>
  )
}

// ── TeamCard ──────────────────────────────────────────────────────────────────

function TeamCard({ name, members, isLeader, onDrop, onAssignSP, onRemoveFromTeam, onDragStart, onViewChar, t }) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      className={`${styles.teamCard} ${dragOver ? styles.teamCardDragOver : ''}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDrop(e, name) }}
    >
      <div className={styles.teamCardHead}>
        <span className={styles.teamCardName}>{name}</span>
        <span className={styles.teamCardCount}>{members.length}</span>
      </div>
      <div className={styles.teamCardSlots}>
        {members.map(reg => (
          <TeamSlot
            key={reg.id}
            reg={reg}
            isLeader={isLeader}
            onDragStart={onDragStart}
            onAssignSP={onAssignSP}
            onRemoveFromTeam={onRemoveFromTeam}
            onClick={onViewChar}
          />
        ))}
        {members.length === 0 && (
          <div className={styles.teamEmptySlot}>
            {isLeader ? t('detail.dropHere') : t('detail.emptyTeam')}
          </div>
        )}
      </div>
    </div>
  )
}

// ── BenchPanel ────────────────────────────────────────────────────────────────

function BenchPanel({
  members, isLeader, isAuthenticated, myRegistrations, maxChars,
  onRegister, onUnregister, onDragStart, onViewChar, onInviteFriends, session, t,
}) {
  const canRegister  = isAuthenticated && myRegistrations.length < maxChars
  const alreadyInAll = isAuthenticated && myRegistrations.length >= maxChars

  return (
    <aside className={styles.bench}>
      <div className={styles.benchHead}>
        <span className={styles.benchTitle}>{t('detail.benchTitle')}</span>
        <span className={styles.benchCount}>{members.length}</span>
      </div>

      <div className={styles.benchList}>
        {members.length === 0 ? (
          <div className={styles.benchEmpty}>{t('detail.benchEmpty')}</div>
        ) : (
          members.map(reg => (
            <div key={reg.id} className={styles.benchRow}>
              {isLeader && (
                <div className={styles.benchDrag} title="Glisser vers une équipe">⠿</div>
              )}
              <CharacterCard
                reg={reg}
                isLeader={isLeader}
                isOwn={myRegistrations.some(r => r.id === reg.id)}
                draggable={isLeader}
                onDragStart={onDragStart}
                onClick={onViewChar}
                onAssignSP={() => {}}
                onRemoveFromTeam={() => {}}
              />
              {(myRegistrations.some(r => r.id === reg.id)) && (
                <button
                  className={styles.benchUnregBtn}
                  onClick={() => onUnregister(reg.id)}
                  title={t('detail.unregister')}
                >✕</button>
              )}
            </div>
          ))
        )}
      </div>

      {isAuthenticated ? (
        <>
          {canRegister ? (
            <Button variant="solid" size="sm" onClick={onRegister} style={{ marginTop: '0.75rem' }}>
              + {t('detail.registerBtn')}
            </Button>
          ) : alreadyInAll ? (
            <p className={styles.benchInfo}>{t('detail.alreadyRegistered')}</p>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={onInviteFriends}
            style={{ marginTop: '0.5rem', width: '100%' }}
          >
            👥 {t('detail.inviteFriendsBtn')}
          </Button>
        </>
      ) : (
        <Link to="/auth?mode=login">
          <Button variant="ghost" size="sm" style={{ marginTop: '0.75rem', width: '100%' }}>
            {t('detail.loginToRegister')}
          </Button>
        </Link>
      )}
    </aside>
  )
}

// ── RegisterModal ─────────────────────────────────────────────────────────────

function RegisterModal({ session, userChars, alreadyNames, onClose, onSuccess, t }) {
  const [selected, setSelected] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const max = session.max_chars_per_person - alreadyNames.length

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const toggle = (char) => {
    setSelected(prev =>
      prev.find(c => c.id === char.id)
        ? prev.filter(c => c.id !== char.id)
        : prev.length < max ? [...prev, char] : prev
    )
  }

  const handleSubmit = async () => {
    if (!selected.length) return setError(t('detail.errNoChar'))
    if (!hasSupabase) { onSuccess(); return }

    // ── Guard 0 : niveau héroïque ─────────────────────────────────
    if (minHero > 0) {
      const failing = selected.find(c => (c.heroLevel ?? 0) < minHero)
      if (failing) return setError(t('detail.errHeroLevel').replace('{min}', minHero))
    }

    setSubmitting(true)

    // ── Guard 1 : serveur ─────────────────────────────────────────
    if (session.server) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, server')
        .eq('id', user.id)
        .single()

      if (!profile?.server) {
        setSubmitting(false)
        return setError(t('session.errNoServer'))
      }
      if (profile.server !== session.server) {
        setSubmitting(false)
        return setError(
          t('session.errServer').replace('{server}', profile.server === 'undercity' ? 'Undercity' : 'Dragonveil')
        )
      }
    }

    // ── Guard 2 : chevauchement de sessions ───────────────────────
    if (session.time) {
      const { data: otherRegs } = await supabase
        .from('raid_session_registrations')
        .select('session_id, raid_sessions(date, time, duration_minutes)')
        .eq('player_id', user.id)
        .neq('session_id', session.id)

      if (otherRegs?.length) {
        const [sh, sm]  = session.time.split(':').map(Number)
        const newStart  = sh * 60 + sm
        const newEnd    = newStart + (session.duration_minutes ?? 0)

        const overlap = otherRegs.some(r => {
          const other = r.raid_sessions
          if (!other?.date || other.date !== session.date || !other.time) return false
          const [oh, om]  = other.time.split(':').map(Number)
          const othStart  = oh * 60 + om
          const othEnd    = othStart + (other.duration_minutes ?? 0)
          // si l'une ou l'autre n'a pas de durée, collision si meme heure de début
          if (!session.duration_minutes && !other.duration_minutes) return newStart === othStart
          return newStart < othEnd && newEnd > othStart
        })
        if (overlap) {
          setSubmitting(false)
          return setError(t('session.errOverlap'))
        }
      }
    }

    // ── Inscription ────────────────────────────────────────────────
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    const rows = selected.map(char => ({
      session_id:         session.id,
      player_id:          user.id,
      player_username:    profileData?.username ?? null,
      character_id:       char.id,
      character_snapshot: {
        name:      char.name,
        class:     char.class,
        level:     char.level,
        heroLevel: char.heroLevel,
        specialists: char.equipment?.specialists ?? [],
      },
    }))

    const { error: dbErr } = await supabase.from('raid_session_registrations').insert(rows)
    setSubmitting(false)
    if (dbErr) return setError(t('detail.errRegister'))
    onSuccess()
  }

  const minHero   = session.min_level ?? 0
  const available = userChars.filter(c => !alreadyNames.includes(c.name))

  // ── Guard 0 : niveau héroïque ─────────────────────────────
  // Vérifié côté client avant submit pour bloquer les persos insuffisants
  const heroInsufficient = (char) => minHero > 0 && (char.heroLevel ?? 0) < minHero

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>{t('detail.registerTitle')}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.registerHint}>
            {t('detail.registerHint').replace('{max}', max)}
          </p>
          {available.length === 0 ? (
            <p className={styles.benchEmpty}>{t('detail.noCharAvailable')}</p>
          ) : (
            <div className={styles.charPickList}>
              {available.map(char => {
                const cls        = CLASSES[char.class]
                const checked    = !!selected.find(c => c.id === char.id)
                const tooLow     = heroInsufficient(char)
                const disabled   = tooLow || (!checked && selected.length >= max)
                return (
                  <button
                    key={char.id}
                    className={`${styles.charPickItem} ${checked ? styles.charPickItemSelected : ''} ${disabled ? styles.charPickItemDisabled : ''}`}
                    onClick={() => !disabled && toggle(char)}
                    title={tooLow ? t('detail.errHeroLevel').replace('{min}', minHero) : undefined}
                  >
                    <span style={{ color: cls?.color }}>{cls?.icon}</span>
                    <div>
                      <span className={styles.charName}>{char.name}</span>
                      <span className={styles.charLevel}>
                        Lv.{char.level}{char.heroLevel > 0 ? ` · H${char.heroLevel}` : ''}
                        {tooLow && <span style={{ color: '#e74c3c', marginLeft: 4 }}>✕ H{minHero}</span>}
                      </span>
                    </div>
                    {checked && <span className={styles.checkMark}>✓</span>}
                  </button>
                )
              })}
            </div>
          )}
          {error && <div className={styles.fieldError}>{error}</div>}
        </div>
        <div className={styles.modalFoot}>
          <Button variant="ghost" onClick={onClose}>{t('session.cancel')}</Button>
          <Button variant="solid" onClick={handleSubmit} disabled={submitting || !selected.length}>
            {submitting ? '…' : t('detail.confirmRegister')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── SPPickerModal ─────────────────────────────────────────────────────────────

function SPPickerModal({ reg, onClose, onAssign, t }) {
  const snap = reg.character_snapshot ?? {}
  const specialists = snap.specialists ?? []

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>
            {t('detail.assignSP')} — {snap.name}
          </h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {specialists.length === 0 ? (
            <p className={styles.benchEmpty}>{t('detail.noSP')}</p>
          ) : (
            <div className={styles.spPickList}>
              <button
                className={styles.spPickItem}
                onClick={() => onAssign(reg.id, null, null)}
              >
                <span style={{ color: 'var(--text-faint)' }}>{t('detail.noSPAssign')}</span>
              </button>
              {specialists.map((sp, i) => (
                <button
                  key={i}
                  className={`${styles.spPickItem} ${reg.sp_card_name === sp.name ? styles.spPickItemActive : ''}`}
                  onClick={() => onAssign(reg.id, sp.name, sp.icon)}
                >
                  {sp.icon && (
                    <img src={sp.icon} alt="" className={styles.spPickIcon} />
                  )}
                  <span>{sp.name}</span>
                  {reg.sp_card_name === sp.name && <span className={styles.checkMark}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── InviteFriendsModal ────────────────────────────────────────────────────────

function InviteFriendsModal({ session, user, regs, onClose, t }) {
  const [friends,    setFriends]    = useState([])
  const [selected,   setSelected]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [sending,    setSending]    = useState(false)
  const [done,       setDone]       = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    if (!hasSupabase || !user?.id) { setLoading(false); return }
    supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .then(async ({ data: rows }) => {
        if (!rows?.length) { setLoading(false); return }
        const friendIds = rows.map(r =>
          r.requester_id === user.id ? r.addressee_id : r.requester_id
        )
        // Exclude already-registered players
        const registeredIds = new Set(regs.map(r => r.player_id))
        const eligible = friendIds.filter(id => !registeredIds.has(id))
        if (!eligible.length) { setLoading(false); return }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', eligible)
        setFriends(profiles ?? [])
        setLoading(false)
      })
  }, [user?.id])

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSend = async () => {
    if (!selected.length) return
    setSending(true)
    const myUsername = user?.user_metadata?.username || user?.email?.split('@')[0]
    await supabase.from('notifications').insert(
      selected.map(uid => ({
        user_id:           uid,
        type:              'session_invite',
        session_id:        session.id,
        session_raid_name: session.raid_slug,
        content_preview:   myUsername,
        related_user_id:   user.id,
      }))
    )
    setSending(false)
    setDone(true)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>👥 {t('detail.inviteFriendsTitle')}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {done ? (
            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1rem 0' }}>
              ✅ {t('detail.inviteSent')}
            </p>
          ) : loading ? (
            <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '1rem 0' }}>…</p>
          ) : friends.length === 0 ? (
            <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '1rem 0' }}>
              {t('detail.inviteNoFriends')}
            </p>
          ) : (
            <div className={styles.charPickList}>
              {friends.map(f => {
                const checked = selected.includes(f.id)
                return (
                  <button
                    key={f.id}
                    className={`${styles.charPickItem} ${checked ? styles.charPickItemSelected : ''}`}
                    onClick={() => toggle(f.id)}
                  >
                    <span>👤</span>
                    <span className={styles.charName}>{f.username}</span>
                    {checked && <span className={styles.checkMark}>✓</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        {!done && (
          <div className={styles.modalFoot}>
            <Button variant="ghost" onClick={onClose}>{t('session.cancel')}</Button>
            <Button
              variant="solid"
              onClick={handleSend}
              disabled={sending || !selected.length || loading}
            >
              {sending ? '…' : t('detail.inviteConfirm')}
            </Button>
          </div>
        )}
        {done && (
          <div className={styles.modalFoot}>
            <Button variant="solid" onClick={onClose}>{t('session.close')}</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── CharacterDetailModal ──────────────────────────────────────────────────────

const RANK_ORDER = { C: 0, B: 1, A: 2, S: 3 }

function EquipSlot({ label, w, t }) {
  if (!w) return (
    <div className={styles.equipSlot}>
      <span className={styles.equipSlotLabel}>{label}</span>
      <span className={styles.equipSlotEmpty}>{t('equipKeys.empty')}</span>
    </div>
  )
  const rarity = w.rarity ? WEAPON_RARITIES.find(r => r.key === w.rarity) : null
  const suffix = (w.improvement ?? 0) > 0 ? ` +${w.improvement}` : ''
  const prefix = rarity?.label ? `${rarity.label} : ` : ''
  return (
    <div className={styles.equipSlot}>
      <span className={styles.equipSlotLabel}>{label}</span>
      <div className={styles.equipSlotContent}>
        <span className={styles.equipSlotName} style={rarity ? { color: rarity.color } : {}}>
          {w.icon && <img src={w.icon} alt="" className={styles.equipSlotIcon} />}
          {prefix}{w.name}{suffix}
        </span>
        {(w.shell?.length > 0 || w.runic?.length > 0) && (
          <div className={styles.shellBlock}>
            {[...w.shell ?? []].sort((a, b) => (RANK_ORDER[a.rank] ?? 0) - (RANK_ORDER[b.rank] ?? 0)).map((eff, i) => {
              const def   = SHELL_EFFECTS.find(e => e.key === eff.key)
              const color = SHELL_RANK_COLORS[eff.rank]
              return (
                <div key={`s${i}`} className={styles.shellLine} style={{ color }}>
                  {eff.rank}-{def?.label ?? eff.key} : {eff.value}
                </div>
              )
            })}
            {w.shell?.length > 0 && w.runic?.length > 0 && <div className={styles.shellDivider} />}
            {(w.runic ?? []).map((eff, i) => {
              const def = RUNIC_EFFECTS.find(e => e.key === eff.key)
              return (
                <div key={`r${i}`} className={styles.shellLine} style={{ color: RUNIC_COLOR }}>
                  ✦ {def?.label ?? eff.key} : {eff.value}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function CharacterDetailModal({ reg, onClose, t }) {
  const snap = reg.character_snapshot ?? {}
  const cls  = CLASSES[snap.class]
  const [charData, setCharData] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [tab,      setTab]      = useState('stuff')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    if (!hasSupabase || !reg.character_id) { setFetching(false); return }
    supabase
      .from('characters')
      .select('equipment')
      .eq('id', reg.character_id)
      .single()
      .then(({ data }) => { setCharData(data); setFetching(false) })
  }, [reg.character_id])

  const equip       = charData?.equipment ?? {}
  const specialists = equip.specialists ?? []

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.charDetailModal}`} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className={styles.modalHead}>
          <div className={styles.charDetailHeader}>
            <span style={{ color: cls?.color, fontSize: '1.4rem', lineHeight: 1 }}>{cls?.icon ?? '?'}</span>
            <div>
              <span className={styles.modalTitle}>{snap.name}</span>
              <span className={styles.charDetailSub}>
                {snap.class} · Lv.{snap.level}{snap.heroLevel > 0 ? ` · H${snap.heroLevel}` : ''}
                {reg.player_username && (
                  <> · <Link to={`/players/${reg.player_username}`} onClick={onClose} className={styles.charDetailProfileLink}>
                    {reg.player_username} →
                  </Link></>
                )}
              </span>
            </div>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {/* ── Tab bar ── */}
        <div className={styles.charDetailTabs}>
          <button
            className={`${styles.charDetailTab} ${tab === 'stuff' ? styles.charDetailTabActive : ''}`}
            onClick={() => setTab('stuff')}
          >
            {t('tabs.equipment')}
          </button>
          <button
            className={`${styles.charDetailTab} ${tab === 'specialists' ? styles.charDetailTabActive : ''}`}
            onClick={() => setTab('specialists')}
          >
            {t('tabs.specialists')}
            {specialists.length > 0 && <span className={styles.charDetailTabCount}>{specialists.length}</span>}
          </button>
        </div>

        {/* ── Body ── */}
        <div className={styles.modalBody}>
          {fetching ? (
            <div className={styles.charDetailLoading}>…</div>
          ) : tab === 'stuff' ? (
            <div className={styles.charDetailSection}>
              <EquipSlot label={t('equipKeys.weapon')}  w={equip.weapon}  t={t} />
              <EquipSlot label={t('equipKeys.offhand')} w={equip.offhand} t={t} />
              <EquipSlot label={t('equipKeys.armor')}   w={equip.armor}   t={t} />
            </div>
          ) : specialists.length === 0 ? (
            <div className={styles.charDetailLoading}>{t('sp.empty')}</div>
          ) : (
            <div className={styles.spDetailList}>
              {specialists.map((sp, i) => (
                <div key={i} className={styles.spDetailItem}>
                  <div className={styles.spDetailTop}>
                    {sp.icon && <img src={sp.icon} alt="" className={styles.spDetailIcon} />}
                    <span className={styles.spDetailName}>{sp.name}</span>
                    <span className={styles.spDetailBadge}>+{sp.improvement ?? 0}</span>
                    <span className={styles.spDetailBadgePerf}>{sp.perfection ?? 0}%</span>
                  </div>
                  {sp.stats && (
                    <div className={styles.spDetailStats}>
                      {[
                        [t('sp.statAtk'),  sp.stats.attack],
                        [t('sp.statDef'),  sp.stats.defense],
                        [t('sp.statElem'), sp.stats.element],
                        [t('sp.statHpmp'), sp.stats.hpmp],
                      ].map(([label, val]) => (
                        <div key={label} className={styles.spDetailStat}>
                          <span className={styles.spDetailStatLabel}>{label}</span>
                          <span className={styles.spDetailStatVal}>{val || '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── MessagesPanel ─────────────────────────────────────────────────────────────

function MessagesPanel({ sessionId, session, regs, isLeader, user, profile, t }) {
  const [messages,   setMessages]   = useState([])
  const [text,       setText]       = useState('')
  const [sending,    setSending]    = useState(false)
  const [error,      setError]      = useState('')
  const bottomRef = useRef(null)

  // Chargement initial
  useEffect(() => {
    if (!hasSupabase) return
    supabase
      .from('raid_session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data ?? []))
  }, [sessionId])

  // Realtime
  useEffect(() => {
    if (!hasSupabase) return
    const ch = supabase
      .channel(`session-msgs-${sessionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'raid_session_messages',
        filter: `session_id=eq.${sessionId}`,
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [...prev, payload.new])
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [sessionId])

  // Scroll auto au dernier message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const content = text.trim()
    if (!content) return setError(t('detail.messageErrEmpty'))
    setError('')
    setSending(true)

    const { data: msg, error: msgErr } = await supabase
      .from('raid_session_messages')
      .insert({
        session_id:      sessionId,
        author_id:       user.id,
        author_username: profile?.username ?? null,
        content,
      })
      .select()
      .single()

    if (msgErr) { setSending(false); return setError(t('detail.messageErrSend')) }

    // Notifier tous les joueurs inscrits (sauf le leader lui-même)
    const targets = [...new Set(regs.map(r => r.player_id))].filter(id => id !== user.id)
    if (targets.length > 0) {
      const raidName = session.raid_slug // on passe le slug, la page notif affichera mieux
      await supabase.from('notifications').insert(
        targets.map(uid => ({
          user_id:           uid,
          type:              'raid_message',
          session_id:        sessionId,
          session_raid_name: raidName,
          content_preview:   content.slice(0, 120),
        }))
      )
    }

    setText('')
    setSending(false)
  }

  const handleDelete = async (id) => {
    setMessages(prev => prev.filter(m => m.id !== id))
    await supabase.from('raid_session_messages').delete().eq('id', id)
  }

  return (
    <div className={styles.messagesPanel}>
      <h3 className={styles.messagesPanelTitle}>💬 {t('detail.messagesTitle')}</h3>

      <div className={styles.messagesList}>
        {messages.length === 0 ? (
          <p className={styles.messagesEmpty}>{t('detail.messagesEmpty')}</p>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={styles.messageRow}>
              <div className={styles.messageMeta}>
                <span className={styles.messageAuthor}>👑 {msg.author_username ?? '?'}</span>
                <span className={styles.messageTime}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {new Date(msg.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                </span>
                {isLeader && (
                  <button
                    className={styles.messageDeleteBtn}
                    onClick={() => handleDelete(msg.id)}
                    title={t('detail.messageDelete')}
                  >✕</button>
                )}
              </div>
              <p className={styles.messageContent}>{msg.content}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {isLeader && (
        <div className={styles.messageCompose}>
          <textarea
            className={styles.messageInput}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t('detail.messagePlaceholder')}
            rows={3}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSend() }}
          />
          {error && <p className={styles.messageError}>{error}</p>}
          <div className={styles.messageActions}>
            <span className={styles.messageHint}>Ctrl+Entrée pour envoyer</span>
            <Button variant="solid" size="sm" onClick={handleSend} disabled={sending}>
              {sending ? t('detail.messageSending') : t('detail.messageSend')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── RaidSessionDetailPage ─────────────────────────────────────────────────────

export default function RaidSessionDetailPage() {
  const { sessionId } = useParams()
  const { user, isAuthenticated } = useAuth()
  const { t, lang } = useLang()
  const { characters: userChars } = useCharacters()
  const navigate = useNavigate()

  const [session,       setSession]       = useState(null)
  const [regs,          setRegs]          = useState([])
  const [profile,       setProfile]       = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [showRegister,  setShowRegister]  = useState(false)
  const [showInvite,    setShowInvite]    = useState(false)
  const [showCancel,    setShowCancel]    = useState(false)
  const [cancelling,    setCancelling]    = useState(false)
  const [spTarget,    setSPTarget]    = useState(null)
  const [charTarget,  setCharTarget]  = useState(null)
  const dragIdRef = useRef(null)

  const raid       = session ? RAIDS.find(r => r.slug === session.raid_slug) : null
  const isLeader   = !!(session && user && session.leader_id === user.id)
  const bench      = regs.filter(r => !r.team_name)
  const myRegs     = regs.filter(r => r.player_id === user?.id)
  const alreadyNames = myRegs.map(r => r.character_snapshot?.name)

  // ── Load session + registrations ────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!hasSupabase) { setLoading(false); return }
    const [{ data: sess }, { data: regData }] = await Promise.all([
      supabase.from('raid_sessions').select('*').eq('id', sessionId).single(),
      supabase.from('raid_session_registrations').select('*').eq('session_id', sessionId).order('created_at'),
    ])
    if (sess) setSession(sess)
    setRegs(regData ?? [])
    setLoading(false)
  }, [sessionId])

  // Charger le profil du user courant (pour le username dans les messages)
  useEffect(() => {
    if (!hasSupabase || !user?.id) return
    supabase.from('profiles').select('username').eq('id', user.id).single()
      .then(({ data }) => setProfile(data))
  }, [user?.id])

  useEffect(() => { loadData() }, [loadData])

  // ── Realtime subscription ────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasSupabase) return
    const channel = supabase
      .channel(`session-regs-${sessionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'raid_session_registrations',
        filter: `session_id=eq.${sessionId}`,
      }, loadData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [sessionId, loadData])

  // ── Drag & drop handlers ────────────────────────────────────────────────────
  const handleDragStart = (e, regId) => {
    dragIdRef.current = regId
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (e, teamName) => {
    const regId = dragIdRef.current
    if (!regId || !isLeader) return
    dragIdRef.current = null
    setRegs(prev => prev.map(r => r.id === regId ? { ...r, team_name: teamName } : r))
    await supabase.from('raid_session_registrations').update({ team_name: teamName }).eq('id', regId)
  }

  const handleRemoveFromTeam = async (regId) => {
    setRegs(prev => prev.map(r => r.id === regId ? { ...r, team_name: null } : r))
    await supabase.from('raid_session_registrations').update({ team_name: null }).eq('id', regId)
  }

  // ── SP assignment ────────────────────────────────────────────────────────────
  const handleAssignSP = async (regId, spName, spIcon) => {
    setSPTarget(null)
    setRegs(prev => prev.map(r => r.id === regId ? { ...r, sp_card_name: spName, sp_card_icon: spIcon } : r))
    await supabase.from('raid_session_registrations')
      .update({ sp_card_name: spName, sp_card_icon: spIcon })
      .eq('id', regId)
  }

  // ── Unregister ───────────────────────────────────────────────────────────────
  const handleUnregister = async (regId) => {
    setRegs(prev => prev.filter(r => r.id !== regId))
    await supabase.from('raid_session_registrations').delete().eq('id', regId)
  }

  // ── Cancel session ────────────────────────────────────────────────────────────
  const handleCancelSession = async () => {
    setCancelling(true)
    // Notifier tous les joueurs inscrits (sauf le leader)
    const targets = [...new Set(regs.map(r => r.player_id))].filter(id => id !== user?.id)
    if (targets.length > 0) {
      await supabase.from('notifications').insert(
        targets.map(uid => ({
          user_id:           uid,
          type:              'session_cancelled',
          session_id:        sessionId,
          session_raid_name: session.raid_slug,
          content_preview:   null,
        }))
      )
    }
    await supabase.from('raid_sessions').delete().eq('id', sessionId)
    setCancelling(false)
    navigate('/raids')
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonHeader} />
        <div className={styles.layout}>
          <div className={styles.teamsArea}>
            {[1, 2].map(i => <div key={i} className={styles.skeletonTeam} />)}
          </div>
          <div className={styles.skeletonBench} />
        </div>
      </div>
    )
  }

  if (!session || !raid) {
    return (
      <div className={styles.page}>
        <Link to="/raids" className={styles.back}>← {t('detail.back')}</Link>
        <p style={{ color: 'var(--text-faint)', textAlign: 'center', marginTop: '4rem' }}>
          {t('detail.notFound')}
        </p>
      </div>
    )
  }

  const teams = session.teams ?? []

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link to="/raids" className={styles.back}>← {t('detail.back')}</Link>
        {isLeader && (
          <button className={styles.cancelSessionBtn} onClick={() => setShowCancel(true)}>
            🗑 {t('detail.cancelBtn')}
          </button>
        )}
      </div>

      <SessionHeader session={session} raid={raid} lang={lang} t={t} regCount={regs.length} />

      <div className={styles.layout}>
        {/* ── Teams ── */}
        <div className={styles.teamsArea}>
          {teams.map(teamName => (
            <TeamCard
              key={teamName}
              name={teamName}
              members={regs.filter(r => r.team_name === teamName)}
              isLeader={isLeader}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onAssignSP={setSPTarget}
              onRemoveFromTeam={handleRemoveFromTeam}
              onViewChar={setCharTarget}
              t={t}
            />
          ))}
        </div>

        {/* ── Bench ── */}
        <BenchPanel
          members={bench}
          isLeader={isLeader}
          isAuthenticated={isAuthenticated}
          myRegistrations={myRegs}
          maxChars={session.max_chars_per_person}
          onRegister={() => setShowRegister(true)}
          onUnregister={handleUnregister}
          onDragStart={handleDragStart}
          onViewChar={setCharTarget}
          onInviteFriends={() => setShowInvite(true)}
          session={session}
          t={t}
        />
      </div>

      {/* ── Messages du chef de raid ── */}
      <MessagesPanel
        sessionId={sessionId}
        session={session}
        regs={regs}
        isLeader={isLeader}
        user={user}
        profile={profile}
        t={t}
      />

      {/* ── Modals ── */}
      {showRegister && (
        <RegisterModal
          session={session}
          userChars={userChars}
          alreadyNames={alreadyNames}
          onClose={() => setShowRegister(false)}
          onSuccess={() => { setShowRegister(false); loadData() }}
          t={t}
        />
      )}
      {showInvite && (
        <InviteFriendsModal
          session={session}
          user={user}
          regs={regs}
          onClose={() => setShowInvite(false)}
          t={t}
        />
      )}
      {spTarget && (
        <SPPickerModal
          reg={spTarget}
          onClose={() => setSPTarget(null)}
          onAssign={handleAssignSP}
          t={t}
        />
      )}
      {charTarget && (
        <CharacterDetailModal
          reg={charTarget}
          onClose={() => setCharTarget(null)}
          t={t}
        />
      )}

      {/* ── Modale confirmation annulation ── */}
      {showCancel && (
        <div className={styles.overlay} onClick={() => !cancelling && setShowCancel(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3 className={styles.modalTitle}>⚠️ {t('detail.cancelConfirmTitle')}</h3>
              <button className={styles.modalClose} onClick={() => setShowCancel(false)} disabled={cancelling}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.cancelConfirmBody}>{t('detail.cancelConfirmBody')}</p>
            </div>
            <div className={styles.modalFoot}>
              <Button variant="ghost" onClick={() => setShowCancel(false)} disabled={cancelling}>
                {t('detail.cancelAbort')}
              </Button>
              <Button variant="solid" onClick={handleCancelSession} disabled={cancelling} className={styles.cancelConfirmBtn}>
                {cancelling ? '…' : t('detail.cancelConfirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
