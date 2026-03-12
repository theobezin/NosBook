import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCharacters } from '@/hooks/useCharacters'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import { RAIDS } from '@/lib/raids'
import { CLASSES } from '@/lib/mockData'
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

function SessionHeader({ session, raid, lang, t, regCount }) {
  const dateStr = fmtDate(session.date, lang)
  const timeStr = session.time ? session.time.slice(0, 5) : t('session.noTime')

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
          <p className={styles.headerDate}>{dateStr} · {timeStr}</p>
          {session.comments && (
            <p className={styles.headerComments}>{session.comments}</p>
          )}
        </div>
      </div>
      <div className={styles.headerBadges}>
        <span className={styles.badge}>⚔️ {t('detail.minLevel')} {session.min_level}</span>
        <span className={styles.badge}>👥 {regCount} / {session.max_players} {t('detail.players')}</span>
        <span className={styles.badge}>🎭 {session.max_chars_per_person} {t('session.charsPerPlayer')}</span>
        {session.teams?.length > 1 && (
          <span className={styles.badge}>🏴 {session.teams.length} {t('detail.teams')}</span>
        )}
      </div>
    </div>
  )
}

// ── CharacterCard ─────────────────────────────────────────────────────────────

function CharacterCard({
  reg, isLeader, isOwn,
  onAssignSP, onRemoveFromTeam, onViewProfile,
  draggable, onDragStart,
}) {
  const snap = reg.character_snapshot ?? {}
  const cls  = CLASSES[snap.class]

  return (
    <div
      className={`${styles.charCard} ${isOwn ? styles.charCardOwn : ''}`}
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart(e, reg.id) : undefined}
    >
      <span className={styles.charClass} style={{ color: cls?.color }}>
        {cls?.icon ?? '?'}
      </span>
      <div className={styles.charInfo}>
        <span className={styles.charName}>{snap.name}</span>
        <span className={styles.charLevel}>
          Lv.{snap.level}{snap.heroLevel > 0 ? ` · H${snap.heroLevel}` : ''}
        </span>
        {reg.sp_card_name && (
          <span className={styles.charSP}>
            {reg.sp_card_icon && (
              <img src={reg.sp_card_icon} alt="" className={styles.charSPIcon} />
            )}
            {reg.sp_card_name}
          </span>
        )}
      </div>

      {isLeader && reg.team_name && (
        <button
          className={styles.charBtn}
          onClick={() => onAssignSP(reg)}
          title="Attribuer une carte SP"
        >
          🎴
        </button>
      )}
      {(isLeader || isOwn) && reg.player_username && (
        <button
          className={styles.charBtn}
          onClick={() => onViewProfile(reg)}
          title="Voir le profil"
        >
          👤
        </button>
      )}
      {isLeader && reg.team_name && (
        <button
          className={`${styles.charBtn} ${styles.charBtnRemove}`}
          onClick={() => onRemoveFromTeam(reg.id)}
          title="Retirer de l'équipe"
        >
          ✕
        </button>
      )}
    </div>
  )
}

// ── TeamSlot ──────────────────────────────────────────────────────────────────

function TeamSlot({ reg, isLeader, onAssignSP, onRemoveFromTeam, onDragStart }) {
  const snap = reg.character_snapshot ?? {}
  const cls  = CLASSES[snap.class]

  return (
    <div
      className={styles.teamSlot}
      draggable={isLeader}
      onDragStart={isLeader ? (e) => onDragStart(e, reg.id) : undefined}
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
            onClick={() => onAssignSP(reg)}
            title="Attribuer une carte SP"
          >🎴</button>
          <button
            className={`${styles.charBtn} ${styles.charBtnRemove}`}
            onClick={() => onRemoveFromTeam(reg.id)}
            title="Retirer de l'équipe"
          >✕</button>
        </>
      )}
    </div>
  )
}

// ── TeamCard ──────────────────────────────────────────────────────────────────

function TeamCard({ name, members, isLeader, onDrop, onAssignSP, onRemoveFromTeam, onDragStart, t }) {
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
  onRegister, onUnregister, onDragStart, onViewProfile, session, t,
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
                onViewProfile={onViewProfile}
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
        canRegister ? (
          <Button variant="solid" size="sm" onClick={onRegister} style={{ marginTop: '0.75rem' }}>
            + {t('detail.registerBtn')}
          </Button>
        ) : alreadyInAll ? (
          <p className={styles.benchInfo}>{t('detail.alreadyRegistered')}</p>
        ) : null
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

    setSubmitting(true)
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    const rows = selected.map(char => ({
      session_id:         session.id,
      player_id:          user.id,
      player_username:    profile?.username ?? null,
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

  const available = userChars.filter(c => !alreadyNames.includes(c.name))

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
                const cls = CLASSES[char.class]
                const checked = !!selected.find(c => c.id === char.id)
                const disabled = !checked && selected.length >= max
                return (
                  <button
                    key={char.id}
                    className={`${styles.charPickItem} ${checked ? styles.charPickItemSelected : ''} ${disabled ? styles.charPickItemDisabled : ''}`}
                    onClick={() => !disabled && toggle(char)}
                  >
                    <span style={{ color: cls?.color }}>{cls?.icon}</span>
                    <div>
                      <span className={styles.charName}>{char.name}</span>
                      <span className={styles.charLevel}>Lv.{char.level}{char.heroLevel > 0 ? ` · H${char.heroLevel}` : ''}</span>
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

// ── ProfileModal ──────────────────────────────────────────────────────────────

function ProfileModal({ reg, onClose, t }) {
  const snap = reg.character_snapshot ?? {}
  const cls  = CLASSES[snap.class]

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.profileModal}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>{reg.player_username ?? t('detail.unknownPlayer')}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.profileRow}>
            <span className={styles.profileClass} style={{ color: cls?.color }}>
              {cls?.icon}
            </span>
            <div>
              <p className={styles.charName}>{snap.name}</p>
              <p className={styles.charLevel}>
                {snap.class} · Lv.{snap.level}
                {snap.heroLevel > 0 ? ` · H${snap.heroLevel}` : ''}
              </p>
            </div>
          </div>

          {(snap.specialists?.length > 0) && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t('detail.specialistsLabel')}</label>
              <div className={styles.spPickList}>
                {snap.specialists.map((sp, i) => (
                  <div key={i} className={styles.spPickItem} style={{ cursor: 'default' }}>
                    {sp.icon && (
                      <img src={sp.icon} alt="" className={styles.spPickIcon} />
                    )}
                    <span>{sp.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reg.player_username && (
            <Link to={`/players/${reg.player_username}`} onClick={onClose}>
              <Button variant="ghost" size="sm" style={{ marginTop: '0.5rem' }}>
                {t('detail.viewFullProfile')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ── RaidSessionDetailPage ─────────────────────────────────────────────────────

export default function RaidSessionDetailPage() {
  const { sessionId } = useParams()
  const { user, isAuthenticated } = useAuth()
  const { t, lang } = useLang()
  const { characters: userChars } = useCharacters()

  const [session,     setSession]     = useState(null)
  const [regs,        setRegs]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [spTarget,    setSPTarget]    = useState(null)   // reg for SP picker
  const [profileTarget, setProfileTarget] = useState(null) // reg for profile modal
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
      <Link to="/raids" className={styles.back}>← {t('detail.back')}</Link>

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
          onViewProfile={setProfileTarget}
          session={session}
          t={t}
        />
      </div>

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
      {spTarget && (
        <SPPickerModal
          reg={spTarget}
          onClose={() => setSPTarget(null)}
          onAssign={handleAssignSP}
          t={t}
        />
      )}
      {profileTarget && (
        <ProfileModal
          reg={profileTarget}
          onClose={() => setProfileTarget(null)}
          t={t}
        />
      )}
    </div>
  )
}
