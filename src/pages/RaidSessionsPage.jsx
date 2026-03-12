import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import { RAIDS, RAID_CATEGORIES } from '@/lib/raids'
import Button from '@/components/ui/Button'
import styles from './RaidSessionsPage.module.css'

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
    comments:          '',
    teams:             [t('session.defaultTeam')],
  })
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
    const { error: dbErr } = await supabase.from('raid_sessions').insert({
      raid_slug:            form.raidSlug,
      date:                 form.date,
      time:                 form.time || null,
      min_level:            Number(form.minLevel),
      max_players:          Number(form.maxPlayers),
      max_chars_per_person: Number(form.maxCharsPerPerson),
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

          {/* Date + Heure */}
          <div className={styles.fieldRow}>
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
  const { isAuthenticated } = useAuth()
  const { t, lang } = useLang()

  const [sessions,    setSessions]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)

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

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.badge}>{t('session.badge')}</div>
        <h1 className={styles.title}>{t('session.title')}</h1>
        <p className={styles.sub}>{t('session.sub')}</p>
      </section>

      {/* ── Contrôles ── */}
      <div className={styles.controls}>
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
        ) : sessions.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🏰</span>
            <span>{t('session.empty')}</span>
          </div>
        ) : (
          sessions.map(s => (
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
