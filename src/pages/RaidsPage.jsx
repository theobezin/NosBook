import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import { RAIDS, RAID_CATEGORIES } from '@/lib/raids'
import Button from '@/components/ui/Button'
import { formatTime, SERVER_COLORS } from '@/lib/utils'
import styles from './RaidsPage.module.css'

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseTime(str) {
  const match = str.trim().match(/^(\d{1,3}):([0-5]\d)$/)
  if (!match) return null
  const total = parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
  return total > 0 ? total : null
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']

// ── RaidSelect ────────────────────────────────────────────────────────────────

function RaidSelect({ value, onChange, lang, t }) {
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
          <span className={styles.raidSelectPlaceholder}>{t('raids.formRaidPlaceholder')}</span>
        )}
        <span className={styles.raidSelectArrow}>▾</span>
      </button>

      {open && (
        <div className={styles.raidSelectDropdown}>
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
                    <img
                      src={`https://nosapki.com/images/icons/${r.icon}.png`}
                      alt=""
                      className={styles.raidSelectIcon}
                    />
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

// ── MemberInput ───────────────────────────────────────────────────────────────

function MemberInput({ value, onChange, placeholder, characters, server }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (q.length < 2) return []
    return characters
      .filter(c => c.server === server && c.name.toLowerCase().includes(q))
      .slice(0, 6)
  }, [value, characters, server])

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className={styles.memberAutocomplete} ref={ref}>
      <input
        className={styles.fieldInput}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        maxLength={30}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className={styles.memberSuggestions}>
          {suggestions.map(c => (
            <button
              key={c.name}
              type="button"
              className={styles.memberSuggestion}
              onMouseDown={e => { e.preventDefault(); onChange(c.name); setOpen(false) }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── SubmitModal ───────────────────────────────────────────────────────────────

function SubmitModal({ onClose, t, lang, characters }) {
  const { user } = useAuth()

  const [form, setForm] = useState({
    raidSlug:    '',
    server:      'undercity',
    teamMembers: [''],
    timeStr:     '',
    proofUrl:    '',
    proofType:   'video',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState(false)

  // Verrouille le scroll du body pendant que la modale est ouverte
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const setField   = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setMember  = (idx, val) => {
    const next = [...form.teamMembers]
    next[idx] = val
    setField('teamMembers', next)
  }
  const addMember    = () => {
    if (form.teamMembers.length < 12) setField('teamMembers', [...form.teamMembers, ''])
  }
  const removeMember = idx => {
    if (form.teamMembers.length > 1) setField('teamMembers', form.teamMembers.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.raidSlug) return setError(t('raids.errRaid'))

    const members = form.teamMembers.map(m => m.trim()).filter(Boolean)
    if (members.length === 0) return setError(t('raids.errTeam'))

    const timeSeconds = parseTime(form.timeStr)
    if (timeSeconds === null) return setError(t('raids.errTime'))

    if (!form.proofUrl.trim()) return setError(t('raids.errProof'))

    setSubmitting(true)
    const { error: dbErr } = await supabase.from('raid_records').insert({
      raid_slug:    form.raidSlug,
      server:       form.server,
      team_members: members,
      time_seconds: timeSeconds,
      proof_url:    form.proofUrl.trim(),
      proof_type:   form.proofType,
      submitted_by: user?.id ?? null,
      status:       'pending',
    })
    setSubmitting(false)

    if (dbErr) return setError(t('raids.errSubmit'))
    setSuccess(true)
  }

  if (success) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.successBody}>
            <div className={styles.successIcon}>✅</div>
            <h3 className={styles.successTitle}>{t('raids.successTitle')}</h3>
            <p className={styles.successSub}>{t('raids.successSub')}</p>
            <Button variant="solid" onClick={onClose}>{t('raids.close')}</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>{t('raids.submitTitle')}</h3>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className={styles.modalBody}>

          {/* Raid */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('raids.formRaid')}</label>
            <RaidSelect
              value={form.raidSlug}
              onChange={v => setField('raidSlug', v)}
              lang={lang}
              t={t}
            />
          </div>

          {/* Serveur */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('raids.formServer')}</label>
            <div className={styles.radioRow}>
              {['undercity', 'dragonveil'].map(s => (
                <label
                  key={s}
                  className={`${styles.radioOpt} ${form.server === s ? styles.radioActive : ''}`}
                  style={{ '--rc': SERVER_COLORS[s] }}
                >
                  <input type="radio" name="server" value={s} checked={form.server === s} onChange={() => setField('server', s)} hidden />
                  <span className={styles.radioDot} style={{ color: SERVER_COLORS[s] }}>●</span>
                  {t(`raids.server.${s}`)}
                </label>
              ))}
            </div>
          </div>

          {/* Équipe */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('raids.formTeam')}</label>
            <div className={styles.teamList}>
              {form.teamMembers.map((m, idx) => (
                <div key={idx} className={styles.teamRow}>
                  <MemberInput
                    value={m}
                    onChange={v => setMember(idx, v)}
                    placeholder={`${t('raids.formMemberPlaceholder')} ${idx + 1}`}
                    characters={characters}
                    server={form.server}
                  />
                  {form.teamMembers.length > 1 && (
                    <button className={styles.removeBtn} onClick={() => removeMember(idx)} aria-label="Retirer">✕</button>
                  )}
                </div>
              ))}
              {form.teamMembers.length < 12 && (
                <button className={styles.addMemberBtn} onClick={addMember}>
                  + {t('raids.formAddMember')}
                </button>
              )}
            </div>
          </div>

          {/* Temps */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('raids.formTime')}</label>
            <input
              className={styles.fieldInput}
              value={form.timeStr}
              onChange={e => setField('timeStr', e.target.value)}
              placeholder="mm:ss"
              maxLength={8}
            />
          </div>

          {/* Type de preuve */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('raids.formProofType')}</label>
            <div className={styles.radioRow}>
              {['video', 'screenshot'].map(pt => (
                <label
                  key={pt}
                  className={`${styles.radioOpt} ${form.proofType === pt ? styles.radioActive : ''}`}
                  style={{ '--rc': 'var(--gold-dim)' }}
                >
                  <input type="radio" name="proofType" value={pt} checked={form.proofType === pt} onChange={() => setField('proofType', pt)} hidden />
                  {pt === 'video' ? '🎬' : '📸'} {t(`raids.proofType.${pt}`)}
                </label>
              ))}
            </div>
          </div>

          {/* Lien de la preuve */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('raids.formProofUrl')}</label>
            <input
              className={styles.fieldInput}
              value={form.proofUrl}
              onChange={e => setField('proofUrl', e.target.value)}
              placeholder={t('raids.formProofUrlPlaceholder')}
            />
          </div>

          {error && <div className={styles.fieldError}>{error}</div>}
        </div>

        <div className={styles.modalFoot}>
          <Button variant="ghost" onClick={onClose}>{t('raids.cancel')}</Button>
          <Button variant="solid" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('raids.submitting') : t('raids.submit')}
          </Button>
        </div>

      </div>
    </div>
  )
}

// ── RaidCard ──────────────────────────────────────────────────────────────────

function RaidCard({ raid, records, expanded, onToggle, charMap, t, lang }) {
  const best = records[0] ?? null

  return (
    <div className={`${styles.raidCard} ${expanded ? styles.raidExpanded : ''} ${!best ? styles.raidEmpty : ''}`}>
      <button className={styles.raidHeader} onClick={onToggle}>
        <div className={styles.raidInfo}>
          <span className={styles.raidName}>{raid[lang] ?? raid.en}</span>
          {best ? (
            <span className={styles.raidBest}>
              🥇 <strong>{formatTime(best.time_seconds)}</strong>
              <span className={styles.raidBestTeam}> · {best.team_members.map((m, i) => {
                const username = charMap?.[best.server]?.[m]
                return (
                  <span key={i}>
                    {i > 0 && ', '}
                    {username ? (
                      <Link
                        to={`/players/${username}`}
                        className={styles.lbTeamLink}
                        onClick={e => e.stopPropagation()}
                      >
                        {m}
                      </Link>
                    ) : m}
                  </span>
                )
              })}</span>
            </span>
          ) : (
            <span className={styles.raidNone}>{t('raids.noRecord')}</span>
          )}
        </div>
        <span
          className={styles.raidChevron}
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div className={styles.lbWrap}>
          {records.length === 0 ? (
            <div className={styles.lbEmpty}>{t('raids.noRecord')}</div>
          ) : (
            records.slice(0, 10).map((rec, idx) => (
              <div key={rec.id} className={styles.lbRow}>
                <div className={styles.lbRank}>
                  {idx < 3
                    ? <span className={styles.lbMedal}>{RANK_MEDALS[idx]}</span>
                    : <span className={styles.lbRankNum}>#{idx + 1}</span>
                  }
                </div>
                <div className={styles.lbTime}>{formatTime(rec.time_seconds)}</div>
                <div className={styles.lbTeam}>
                  {rec.team_members.map((m, i) => {
                    const username = charMap?.[rec.server]?.[m]
                    return (
                      <span key={i}>
                        {i > 0 && ', '}
                        {username ? (
                          <Link
                            to={`/players/${username}`}
                            className={styles.lbTeamLink}
                            onClick={e => e.stopPropagation()}
                          >
                            {m}
                          </Link>
                        ) : m}
                      </span>
                    )
                  })}
                </div>
                <div className={styles.lbRight}>
                  <span
                    className={styles.lbServerBadge}
                    style={{ color: SERVER_COLORS[rec.server], borderColor: SERVER_COLORS[rec.server] + '55' }}
                  >
                    {t(`raids.server.${rec.server}`)}
                  </span>
                  <a
                    href={rec.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.lbProof}
                    title={t(`raids.proofType.${rec.proof_type}`)}
                    onClick={e => e.stopPropagation()}
                  >
                    {rec.proof_type === 'video' ? '🎬' : '📸'}
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── RaidsPage ─────────────────────────────────────────────────────────────────

export default function RaidsPage() {
  const { isAuthenticated } = useAuth()
  const { t, lang } = useLang()

  const [server,        setServer]        = useState('all')
  const [search,        setSearch]        = useState('')
  const [records,       setRecords]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [expandedSlug,  setExpandedSlug]  = useState(null)
  const [showSubmit,    setShowSubmit]    = useState(false)
  const [characters,    setCharacters]    = useState([])

  useEffect(() => {
    if (!hasSupabase) return
    supabase
      .from('characters')
      .select('name, server, profiles(username)')
      .not('server', 'is', null)
      .then(({ data }) => setCharacters(data ?? []))
  }, [])

  useEffect(() => {
    if (!hasSupabase) { setLoading(false); return }

    setLoading(true)
    let q = supabase
      .from('raid_records')
      .select('id, raid_slug, server, team_members, time_seconds, proof_url, proof_type')
      .eq('status', 'approved')
      .order('time_seconds', { ascending: true })

    if (server !== 'all') q = q.eq('server', server)

    q.then(({ data }) => setRecords(data ?? [])).finally(() => setLoading(false))
  }, [server])

  // Groupe les records par raid_slug (déjà triés par time_seconds ASC côté DB)
  const recordsByRaid = useMemo(() => {
    const map = {}
    for (const r of records) {
      if (!map[r.raid_slug]) map[r.raid_slug] = []
      map[r.raid_slug].push(r)
    }
    return map
  }, [records])

  const filteredRaids = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return RAIDS
    return RAIDS.filter(r => (r[lang] ?? r.en).toLowerCase().includes(q))
  }, [search, lang])

  // Groupement par catégorie, avec les raids ayant des records en premier dans chaque groupe
  const raidsByCategory = useMemo(() => {
    return RAID_CATEGORIES.map(cat => {
      const raids = filteredRaids.filter(r => r.act === cat.key)
      const sorted = [...raids].sort((a, b) => {
        const aHas = (recordsByRaid[a.slug] ?? []).length > 0
        const bHas = (recordsByRaid[b.slug] ?? []).length > 0
        return (bHas ? 1 : 0) - (aHas ? 1 : 0)
      })
      return { cat, raids: sorted }
    }).filter(({ raids }) => raids.length > 0)
  }, [filteredRaids, recordsByRaid])

  // charMap[server][charName] = profileUsername — pour les liens dans le leaderboard
  const charMap = useMemo(() => {
    const map = {}
    for (const c of characters) {
      const s = c.server
      const u = c.profiles?.username
      if (s && u) {
        if (!map[s]) map[s] = {}
        map[s][c.name] = u
      }
    }
    return map
  }, [characters])

  const raidsCovered = Object.keys(recordsByRaid).length

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.badge}>{t('raids.badge')}</div>
        <h1 className={styles.title}>{t('raids.title')}</h1>
        <p className={styles.sub}>{t('raids.sub')}</p>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatVal}>{raidsCovered}</span>
            <span className={styles.heroStatKey}>{t('raids.statsRaids')}</span>
          </div>
          <div className={styles.heroStat}>
            <span className={styles.heroStatVal}>{records.length}</span>
            <span className={styles.heroStatKey}>{t('raids.statsRecords')}</span>
          </div>
        </div>
      </section>

      {/* ── Contrôles ── */}
      <div className={styles.controls}>
        <div className={styles.tabs}>
          {['all', 'undercity', 'dragonveil'].map(s => (
            <button
              key={s}
              className={`${styles.tab} ${server === s ? styles.tabActive : ''}`}
              style={s !== 'all' ? { '--tc': SERVER_COLORS[s] } : {}}
              onClick={() => { setServer(s); setExpandedSlug(null) }}
            >
              {s !== 'all' && <span style={{ color: SERVER_COLORS[s] }}>● </span>}
              {t(`raids.server.${s}`)}
            </button>
          ))}
        </div>

        <div className={styles.controlsRight}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('raids.searchPlaceholder')}
              autoComplete="off"
            />
            {search && (
              <button className={styles.clearBtn} onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {isAuthenticated ? (
            <Button variant="solid" size="sm" onClick={() => setShowSubmit(true)}>
              + {t('raids.submitBtn')}
            </Button>
          ) : (
            <Link to="/auth?mode=login">
              <Button variant="ghost" size="sm">{t('raids.submitBtn')}</Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Liste des raids par catégorie ── */}
      <div className={styles.raidList}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`${styles.raidCard} ${styles.raidSkeleton}`} />
          ))
        ) : raidsByCategory.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🔎</span>
            <span>{t('raids.noResults')}</span>
          </div>
        ) : (
          raidsByCategory.map(({ cat, raids }) => (
            <div key={cat.key} className={styles.category}>
              <h3 className={styles.categoryTitle}>{cat[lang] ?? cat.en}</h3>
              {raids.map(raid => (
                <RaidCard
                  key={raid.slug}
                  raid={raid}
                  records={recordsByRaid[raid.slug] ?? []}
                  expanded={expandedSlug === raid.slug}
                  onToggle={() => setExpandedSlug(p => p === raid.slug ? null : raid.slug)}
                  charMap={charMap}
                  t={t}
                  lang={lang}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* ── Modale de soumission ── */}
      {showSubmit && (
        <SubmitModal onClose={() => setShowSubmit(false)} t={t} lang={lang} characters={characters} />
      )}

    </div>
  )
}
