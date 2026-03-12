import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import { RAIDS, RAID_CATEGORIES } from '@/lib/raids'
import { SERVER_COLORS } from '@/lib/utils'
import Button from '@/components/ui/Button'
import styles from './RaidSessionsPage.module.css'

const SERVERS = ['undercity', 'dragonveil']

function DurationPicker({ value, onChange }) {
  // useRef so the click handler always reads the latest value,
  // even if React hasn't flushed the prop update yet between rapid clicks
  const valueRef = useRef(value)
  valueRef.current = value

  const adjust = (type, delta) => {
    const v = valueRef.current
    const h = Math.floor(v / 60)
    const m = v % 60
    if (type === 'h') {
      onChange(Math.max(0, Math.min(23, h + delta)) * 60 + m)
    } else {
      const nm = Math.round((m + delta) / 5) * 5
      onChange(h * 60 + Math.max(0, Math.min(55, nm)))
    }
  }

  const hours   = Math.floor(value / 60)
  const minutes = value % 60

  return (
    <div className={styles.durationPicker}>
      <div className={styles.durationUnit}>
        <button type="button" className={styles.durationBtn} onClick={() => adjust('h', -1)}>−</button>
        <span className={styles.durationVal}>{hours}<small>h</small></span>
        <button type="button" className={styles.durationBtn} onClick={() => adjust('h', +1)}>+</button>
      </div>
      <div className={styles.durationUnit}>
        <button type="button" className={styles.durationBtn} onClick={() => adjust('m', -5)}>−</button>
        <span className={styles.durationVal}>{String(minutes).padStart(2, '0')}<small>min</small></span>
        <button type="button" className={styles.durationBtn} onClick={() => adjust('m', +5)}>+</button>
      </div>
    </div>
  )
}

// ── SessionRaidSelect ─────────────────────────────────────────────────────────

function SessionRaidSelect({ value, onChange, recentSlugs, lang, t }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = RAIDS.find(r => r.slug === value) ?? null

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const recentRaids = recentSlugs.map(s => RAIDS.find(r => r.slug === s)).filter(Boolean)

  return (
    <div className={styles.raidSelect} ref={ref}>
      <button
        type="button"
        className={styles.raidSelectTrigger}
        onClick={() => setOpen(o => !o)}
      >
        {selected ? (
          <>
            <img
              src={`https://nosapki.com/images/icons/${selected.icon}.png`}
              alt=""
              className={styles.raidSelectIcon}
            />
            <span className={styles.raidSelectName}>{selected[lang] ?? selected.en}</span>
          </>
        ) : (
          <span className={styles.raidSelectPlaceholder}>{t('session.formRaidPlaceholder')}</span>
        )}
        <span className={styles.raidSelectArrow}>▾</span>
      </button>

      {open && (
        <div className={styles.raidSelectDropdown}>
          {recentRaids.length > 0 && (
            <div>
              <div className={styles.raidSelectGroupLabel}>{t('session.recentRaids')}</div>
              {recentRaids.map(r => (
                <button
                  key={r.slug}
                  type="button"
                  className={`${styles.raidSelectOption} ${value === r.slug ? styles.raidSelectOptionActive : ''}`}
                  onClick={() => { onChange(r.slug); setOpen(false) }}
                >
                  <img src={`https://nosapki.com/images/icons/${r.icon}.png`} alt="" className={styles.raidSelectIcon} />
                  <span>{r[lang] ?? r.en}</span>
                </button>
              ))}
            </div>
          )}
          {RAID_CATEGORIES.map(cat => {
            const raids = RAIDS.filter(r => r.act === cat.key)
            if (!raids.length) return null
            return (
              <div key={cat.key}>
                <div className={styles.raidSelectGroupLabel}>{cat[lang] ?? cat.en}</div>
                {raids.map(r => (
                  <button
                    key={r.slug}
                    type="button"
                    className={`${styles.raidSelectOption} ${value === r.slug ? styles.raidSelectOptionActive : ''}`}
                    onClick={() => { onChange(r.slug); setOpen(false) }}
                  >
                    <img src={`https://nosapki.com/images/icons/${r.icon}.png`} alt="" className={styles.raidSelectIcon} />
                    <span>{r[lang] ?? r.en}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── CreateSessionModal ────────────────────────────────────────────────────────

function CreateSessionModal({ onClose, t, lang, onCreated }) {
  const { user } = useAuth()

  const [savedConfigs, setSavedConfigs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nosbook_session_configs') || '[]') } catch { return [] }
  })
  const [recentSlugs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nosbook_recent_raids') || '[]') } catch { return [] }
  })

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    raidSlug:          '',
    date:              today,
    time:              '',
    minLevel:          1,
    maxPlayers:        '',
    maxCharsPerPerson: 1,
    durationMinutes:   60,
    server:            '',
    comments:          '',
    teams:             [t('session.defaultTeam')],
  })

  // Pré-remplir le serveur depuis le profil du leader
  useEffect(() => {
    if (!user?.id || !hasSupabase) return
    supabase.from('profiles').select('server').eq('id', user.id).single()
      .then(({ data }) => { if (data?.server) setForm(f => ({ ...f, server: data.server })) })
  }, [user?.id])
  const [editingTeamIdx, setEditingTeamIdx] = useState(null)
  const [showSaveConfig, setShowSaveConfig] = useState(false)
  const [configName,     setConfigName]     = useState('')
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState('')
  const [success,        setSuccess]        = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleRaidChange = (slug) => {
    const raid = RAIDS.find(r => r.slug === slug)
    setForm(f => ({
      ...f,
      raidSlug:   slug,
      maxPlayers: raid?.maxPlayers ?? 15,
      minLevel:   raid?.minLevel   ?? 1,
    }))
  }

  // ── Team helpers ────────────────────────────────────────────────
  const addTeam = () => {
    const idx = form.teams.length + 1
    setForm(f => ({ ...f, teams: [...f.teams, `${t('session.defaultTeam').replace(' 1', '')} ${idx}`] }))
  }
  const renameTeam = (idx, name) => {
    setForm(f => {
      const next = [...f.teams]
      next[idx] = name
      return { ...f, teams: next }
    })
  }
  const removeTeam = (idx) => {
    setForm(f => ({ ...f, teams: f.teams.filter((_, i) => i !== idx) }))
    if (editingTeamIdx === idx) setEditingTeamIdx(null)
  }

  // ── Saved configs ───────────────────────────────────────────────
  const handleSaveConfig = () => {
    if (!configName.trim()) return
    const config = {
      id:                Date.now().toString(),
      name:              configName.trim(),
      raidSlug:          form.raidSlug,
      minLevel:          form.minLevel,
      maxCharsPerPerson: form.maxCharsPerPerson,
      durationMinutes:   form.durationMinutes,
      comments:          form.comments,
      teams:             form.teams,
    }
    const next = [...savedConfigs, config]
    setSavedConfigs(next)
    localStorage.setItem('nosbook_session_configs', JSON.stringify(next))
    setConfigName('')
    setShowSaveConfig(false)
  }

  const loadConfig = (config) => {
    const raid = RAIDS.find(r => r.slug === config.raidSlug)
    setForm(f => ({
      ...f,
      raidSlug:          config.raidSlug,
      maxPlayers:        raid?.maxPlayers ?? 15,
      minLevel:          config.minLevel ?? raid?.minLevel ?? 1,
      maxCharsPerPerson: config.maxCharsPerPerson,
      durationMinutes:   config.durationMinutes ?? 60,
      comments:          config.comments,
      teams:             config.teams ?? [t('session.defaultTeam')],
    }))
  }

  const deleteConfig = (id) => {
    const next = savedConfigs.filter(c => c.id !== id)
    setSavedConfigs(next)
    localStorage.setItem('nosbook_session_configs', JSON.stringify(next))
  }

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('')
    if (!form.raidSlug) return setError(t('session.errRaid'))
    if (!form.date)     return setError(t('session.errDate'))
    if (!form.server)   return setError(t('session.errServerRequired'))

    const recent = [form.raidSlug, ...recentSlugs.filter(s => s !== form.raidSlug)].slice(0, 5)
    localStorage.setItem('nosbook_recent_raids', JSON.stringify(recent))

    if (!hasSupabase) { setSuccess(true); return }

    setSubmitting(true)
    let leaderUsername = null
    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()
      leaderUsername = profile?.username ?? null
    }
    // ── Guard : chevauchement de sessions ─────────────────────────
    if (form.time && form.durationMinutes && user?.id) {
      const [fh, fm] = form.time.split(':').map(Number)
      const newStart = fh * 60 + fm
      const newEnd   = newStart + form.durationMinutes

      function overlaps(oTime, oDur) {
        if (!oTime) return false
        const [oh, om] = oTime.split(':').map(Number)
        const oStart = oh * 60 + om
        const oEnd   = oStart + (oDur ?? 0)
        return newStart < oEnd && newEnd > oStart
      }

      // Sessions dont l'utilisateur est leader ce jour-là
      const { data: ledSessions } = await supabase
        .from('raid_sessions')
        .select('time, duration_minutes')
        .eq('leader_id', user.id)
        .eq('date', form.date)

      if ((ledSessions ?? []).some(s => overlaps(s.time, s.duration_minutes))) {
        setSubmitting(false)
        return setError(t('session.errOverlap'))
      }

      // Sessions auxquelles l'utilisateur est inscrit ce jour-là
      const { data: regs } = await supabase
        .from('raid_session_registrations')
        .select('raid_sessions(date, time, duration_minutes)')
        .eq('player_id', user.id)

      const regOverlap = (regs ?? []).some(r => {
        const s = r.raid_sessions
        return s?.date === form.date && overlaps(s.time, s.duration_minutes)
      })
      if (regOverlap) {
        setSubmitting(false)
        return setError(t('session.errOverlap'))
      }
    }

    const { error: dbErr } = await supabase.from('raid_sessions').insert({
      raid_slug:            form.raidSlug,
      date:                 form.date,
      time:                 form.time || null,
      min_level:            Number(form.minLevel),
      max_players:          Number(form.maxPlayers),
      max_chars_per_person: Number(form.maxCharsPerPerson),
      duration_minutes:     Number(form.durationMinutes) || null,
      server:               form.server || null,
      comments:             form.comments.trim() || null,
      teams:                form.teams,
      leader_id:            user?.id ?? null,
      leader_username:      leaderUsername,
    })
    setSubmitting(false)

    if (dbErr) return setError(t('session.errCreate'))
    setSuccess(true)
    onCreated?.()
  }

  if (success) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.successBody}>
            <div className={styles.successIcon}>✅</div>
            <h3 className={styles.successTitle}>{t('session.successTitle')}</h3>
            <p className={styles.successSub}>{t('session.successSub')}</p>
            <Button variant="solid" onClick={onClose}>{t('session.close')}</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>{t('session.modalTitle')}</h3>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className={styles.modalBody}>

          {/* Configs sauvegardées */}
          {savedConfigs.length > 0 && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t('session.savedConfigs')}</label>
              <div className={styles.configList}>
                {savedConfigs.map(cfg => (
                  <div key={cfg.id} className={styles.configRow}>
                    <span className={styles.configName}>{cfg.name}</span>
                    <div className={styles.configActions}>
                      <button className={styles.configLoadBtn} onClick={() => loadConfig(cfg)}>
                        {t('session.loadConfig')}
                      </button>
                      <button className={styles.configDeleteBtn} onClick={() => deleteConfig(cfg.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raid */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('session.formRaid')}</label>
            <SessionRaidSelect
              value={form.raidSlug}
              onChange={handleRaidChange}
              recentSlugs={recentSlugs}
              lang={lang}
              t={t}
            />
          </div>

          {/* Serveur */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('session.formServer')}</label>
            <div className={styles.serverBtns}>
              {SERVERS.map(s => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.serverBtn} ${form.server === s ? styles.serverBtnActive : ''}`}
                  style={{ '--srv-color': SERVER_COLORS[s] }}
                  onClick={() => setField('server', s)}
                >
                  {t(`raids.server.${s}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Heure + Durée */}
          <div className={styles.fieldRow3}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t('session.formDate')}</label>
              <input
                type="date"
                className={styles.fieldInput}
                value={form.date}
                onChange={e => setField('date', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t('session.formTime')}</label>
              <input
                type="time"
                className={styles.fieldInput}
                value={form.time}
                onChange={e => setField('time', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t('session.formDuration')}</label>
              <DurationPicker
                value={form.durationMinutes}
                onChange={v => setField('durationMinutes', v)}
              />
            </div>
          </div>

          {/* Niveau min + Joueurs max + Persos max par joueur */}
          <div className={styles.fieldRow3}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t('session.formMinLevel')}</label>
              <input
                type="number"
                className={styles.fieldInput}
                value={form.minLevel}
                min={1}
                max={99}
                onChange={e => setField('minLevel', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t('session.formMaxPlayers')}</label>
              <input
                type="number"
                className={styles.fieldInput}
                value={form.maxPlayers}
                min={1}
                max={100}
                onChange={e => setField('maxPlayers', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t('session.formMaxChars')}</label>
              <input
                type="number"
                className={styles.fieldInput}
                value={form.maxCharsPerPerson}
                min={1}
                max={10}
                onChange={e => setField('maxCharsPerPerson', e.target.value)}
              />
            </div>
          </div>

          {/* Équipes */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('session.formTeams')}</label>
            <div className={styles.teamList}>
              {form.teams.map((team, idx) => (
                <div key={idx} className={styles.teamRow}>
                  {editingTeamIdx === idx ? (
                    <input
                      className={`${styles.fieldInput} ${styles.teamInput}`}
                      value={team}
                      onChange={e => renameTeam(idx, e.target.value)}
                      onBlur={() => setEditingTeamIdx(null)}
                      onKeyDown={e => e.key === 'Enter' && setEditingTeamIdx(null)}
                      autoFocus
                    />
                  ) : (
                    <span
                      className={styles.teamName}
                      onClick={() => setEditingTeamIdx(idx)}
                      title={t('session.teamClickToRename')}
                    >
                      {team}
                    </span>
                  )}
                  <div className={styles.teamActions}>
                    <button className={styles.configLoadBtn} onClick={() => setEditingTeamIdx(idx)}>
                      ✏
                    </button>
                    {form.teams.length > 1 && (
                      <button className={styles.configDeleteBtn} onClick={() => removeTeam(idx)}>✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button className={styles.addTeamBtn} onClick={addTeam}>
              + {t('session.addTeam')}
            </button>
          </div>

          {/* Commentaires */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('session.formComments')}</label>
            <textarea
              className={`${styles.fieldInput} ${styles.fieldTextarea}`}
              value={form.comments}
              onChange={e => setField('comments', e.target.value)}
              placeholder={t('session.formCommentsPlaceholder')}
              rows={3}
            />
          </div>

          {/* Sauvegarder config */}
          {showSaveConfig ? (
            <div className={styles.saveConfigRow}>
              <input
                className={styles.fieldInput}
                value={configName}
                onChange={e => setConfigName(e.target.value)}
                placeholder={t('session.saveConfigNamePlaceholder')}
                onKeyDown={e => e.key === 'Enter' && handleSaveConfig()}
                autoFocus
              />
              <Button variant="solid" size="sm" onClick={handleSaveConfig}>
                {t('session.saveConfigConfirm')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowSaveConfig(false); setConfigName('') }}>
                ✕
              </Button>
            </div>
          ) : (
            <button className={styles.saveConfigTrigger} onClick={() => setShowSaveConfig(true)}>
              + {t('session.saveConfigBtn')}
            </button>
          )}

          {error && <div className={styles.fieldError}>{error}</div>}
        </div>

        <div className={styles.modalFoot}>
          <Button variant="ghost" onClick={onClose}>{t('session.cancel')}</Button>
          <Button variant="solid" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('session.creating') : t('session.createAction')}
          </Button>
        </div>

      </div>
    </div>
  )
}

// ── SessionCard ───────────────────────────────────────────────────────────────

function SessionCard({ session, lang, t }) {
  const navigate = useNavigate()
  const raid = RAIDS.find(r => r.slug === session.raid_slug)
  if (!raid) return null

  const dateStr = new Date(session.date + 'T00:00:00').toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-US',
    { weekday: 'short', day: 'numeric', month: 'short' }
  )
  const timeStr = session.time
    ? session.time.slice(0, 5)
    : t('session.noTime')

  return (
    <div
      className={`${styles.sessionCard} ${styles.sessionCardClickable}`}
      style={{ '--raid-color': raid.color }}
      onClick={() => navigate(`/raids/${session.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/raids/${session.id}`)}
    >
      <div className={styles.sessionCardAccent} />
      <img
        src={`https://nosapki.com/images/icons/${raid.icon}.png`}
        alt=""
        className={styles.sessionCardIcon}
      />
      <div className={styles.sessionCardInfo}>
        <span className={styles.sessionCardName}>{raid[lang] ?? raid.en}</span>
        <span className={styles.sessionCardDate}>{dateStr} · {timeStr}</span>
        {session.comments && (
          <span className={styles.sessionCardComments}>{session.comments}</span>
        )}
      </div>
      <div className={styles.sessionCardMeta}>
        {session.server && (
          <span
            className={styles.sessionMetaBadge}
            style={{ color: SERVER_COLORS[session.server], borderColor: SERVER_COLORS[session.server] + '55' }}
          >
            ● {t(`raids.server.${session.server}`)}
          </span>
        )}
        {session.leader_username && (
          <span className={styles.sessionMetaBadge}>
            👑 {session.leader_username}
          </span>
        )}
        {(() => {
          const registered = session.raid_session_registrations?.[0]?.count ?? 0
          const spots = session.max_players - registered
          return spots <= 0 ? (
            <span className={`${styles.sessionMetaBadge} ${styles.sessionMetaBadgeFull}`}>
              {t('session.spotsFull')}
            </span>
          ) : (
            <span className={styles.sessionMetaBadge}>
              🎫 {spots} {t('session.spotsLeft')}
            </span>
          )
        })()}
        <span className={styles.sessionMetaBadge}>
          ⚔️ {session.max_chars_per_person} {t('session.charsPerPlayer')}
        </span>
      </div>
      <span className={styles.sessionCardArrow}>›</span>
    </div>
  )
}

// ── RaidSessionsPage ──────────────────────────────────────────────────────────

export default function RaidSessionsPage() {
  const { user, isAuthenticated } = useAuth()
  const { t, lang } = useLang()

  const [sessions,    setSessions]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)

  // Onglets
  const [tab, setTab] = useState('all')   // 'all' | 'mine'

  // IDs des sessions auxquelles l'utilisateur est inscrit
  const [myRegIds, setMyRegIds] = useState(new Set())

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !hasSupabase) return
    supabase
      .from('raid_session_registrations')
      .select('session_id')
      .eq('player_id', user.id)
      .then(({ data }) => setMyRegIds(new Set((data ?? []).map(r => r.session_id))))
  }, [user?.id, isAuthenticated])

  // Filtres
  const [filterServer, setFilterServer] = useState('')
  const [filterAct,    setFilterAct]    = useState('')
  const [filterDate,   setFilterDate]   = useState('')

  const loadSessions = () => {
    if (!hasSupabase) { setLoading(false); return }
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    supabase
      .from('raid_sessions')
      .select('*, raid_session_registrations(count)')
      .gte('date', today)
      .order('date', { ascending: true })
      .then(({ data }) => setSessions(data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadSessions() }, [])

  // Filtrage côté client
  const actSlugs = filterAct
    ? new Set(RAIDS.filter(r => r.act === filterAct).map(r => r.slug))
    : null

  const today = new Date().toISOString().slice(0, 10)

  const applyFilters = (list) => list.filter(s => {
    if (s.date === today && s.time) {
      const [h, m]     = s.time.split(':').map(Number)
      const endMinutes  = h * 60 + m + (s.duration_minutes ?? 0)
      const now         = new Date()
      const nowMinutes  = now.getHours() * 60 + now.getMinutes()
      if (nowMinutes > endMinutes) return false
    }
    if (filterServer && s.server !== filterServer) return false
    if (actSlugs     && !actSlugs.has(s.raid_slug)) return false
    if (filterDate   && s.date !== filterDate)       return false
    return true
  })

  const filtered = applyFilters(sessions)
  const mine     = applyFilters(
    sessions.filter(s => s.leader_id === user?.id || myRegIds.has(s.id))
  )

  const displayed = tab === 'mine' ? mine : filtered

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.badge}>{t('session.badge')}</div>
        <h1 className={styles.title}>{t('session.title')}</h1>
        <p className={styles.sub}>{t('session.sub')}</p>
      </section>

      {/* ── Onglets ── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${tab === 'all' ? styles.tabActive : ''}`}
          onClick={() => setTab('all')}
        >{t('session.tabAll')}</button>
        {isAuthenticated && (
          <button
            className={`${styles.tabBtn} ${tab === 'mine' ? styles.tabActive : ''}`}
            onClick={() => setTab('mine')}
          >
            {t('session.tabMine')}
            {mine.length > 0 && <span className={styles.tabCount}>{mine.length}</span>}
          </button>
        )}
      </div>

      {/* ── Contrôles + Filtres ── */}
      <div className={styles.controls}>
        <div className={styles.filters}>
          {/* Filtre serveur */}
          <div className={styles.filterGroup}>
            <button
              className={`${styles.filterBtn} ${!filterServer ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterServer('')}
            >{t('session.filterAll')}</button>
            {SERVERS.map(s => (
              <button
                key={s}
                className={`${styles.filterBtn} ${filterServer === s ? styles.filterBtnActive : ''}`}
                style={filterServer === s ? { '--f-color': SERVER_COLORS[s] } : {}}
                onClick={() => setFilterServer(v => v === s ? '' : s)}
              >
                <span style={{ color: SERVER_COLORS[s] }}>●</span> {t(`raids.server.${s}`)}
              </button>
            ))}
          </div>

          {/* Filtre acte */}
          <div className={styles.filterGroup}>
            <button
              className={`${styles.filterBtn} ${!filterAct ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterAct('')}
            >{t('session.filterAll')}</button>
            {RAID_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                className={`${styles.filterBtn} ${filterAct === cat.key ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterAct(v => v === cat.key ? '' : cat.key)}
              >{cat[lang] ?? cat.en}</button>
            ))}
          </div>

          {/* Filtre date */}
          <div className={styles.filterGroup}>
            <input
              type="date"
              className={styles.filterDateInput}
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              title={t('session.filterByDate')}
            />
            {filterDate && (
              <button className={styles.filterBtn} onClick={() => setFilterDate('')}>✕</button>
            )}
          </div>
        </div>

        {isAuthenticated ? (
          <Button variant="solid" size="sm" onClick={() => setShowCreate(true)}>
            + {t('session.createBtn')}
          </Button>
        ) : (
          <Link to="/auth?mode=login">
            <Button variant="ghost" size="sm">{t('session.createBtn')}</Button>
          </Link>
        )}
      </div>

      {/* ── Liste des sessions ── */}
      <div className={styles.sessionList}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.sessionCard} ${styles.sessionSkeleton}`} />
          ))
        ) : tab === 'mine' && mine.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🏰</span>
            <span>{t('session.emptyMine')}</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🏰</span>
            <span>{t('session.empty')}</span>
          </div>
        ) : displayed.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🔍</span>
            <span>{t('raids.noResults')}</span>
          </div>
        ) : (
          displayed.map(s => (
            <SessionCard key={s.id} session={s} lang={lang} t={t} />
          ))
        )}
      </div>

      {/* ── Modale de création ── */}
      {showCreate && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreated={loadSessions}
          t={t}
          lang={lang}
        />
      )}

    </div>
  )
}
