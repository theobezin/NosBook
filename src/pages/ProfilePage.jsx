import { useState, useRef, useEffect } from 'react'
import { Link }    from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { useCharacters } from '@/hooks/useCharacters'
import { CLASSES, STAT_KEYS, EQUIP_KEYS, SPECIAL_KEYS, SPECIALISTS } from '@/lib/mockData'
import Button from '@/components/ui/Button'
import styles from './ProfilePage.module.css'

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_CHARS = 4

function makeCharacter(name, cls, level, heroLevel) {
  return {
    id:          `char-${Date.now()}`,
    name:        name.trim(),
    class:       cls,
    level:       Math.max(1, Math.min(99, parseInt(level) || 1)),
    heroLevel:   Math.max(0, parseInt(heroLevel) || 0),
    prestige:    0,
    element:     'Neutral',
    stats:       Object.fromEntries(STAT_KEYS.map(k => [k, null])),
    equipment:   {
      ...Object.fromEntries([...EQUIP_KEYS, ...SPECIAL_KEYS].map(k => [k, null])),
      specialists: [],
    },
    resistances: { fire: 0, water: 0, light: 0, shadow: 0 },
  }
}

// ── CreateModal ────────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreate }) {
  const { t } = useLang()
  const [name,      setName]      = useState('')
  const [cls,       setCls]       = useState('Archer')
  const [level,     setLevel]     = useState('99')
  const [heroLevel, setHeroLevel] = useState('0')
  const [error,     setError]     = useState('')

  const CLASS_KEYS = Object.keys(CLASSES)

  const handleCreate = () => {
    if (!name.trim())                    { setError(t('create.errName'));    return }
    if (name.trim().length < 3)          { setError(t('create.errNameLen')); return }
    const lvl = parseInt(level)
    if (!lvl || lvl < 1 || lvl > 99)    { setError(t('create.errLevel'));   return }
    onCreate(makeCharacter(name, cls, lvl, heroLevel))
    onClose()
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>

        <h2 className={styles.modalTitle}>{t('create.title')}</h2>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t('create.nameLabel')}</label>
          <input
            className={styles.modalInput}
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder={t('create.namePlaceholder')}
            autoFocus
            maxLength={20}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          />
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t('create.classLabel')}</label>
          <div className={styles.classGrid}>
            {CLASS_KEYS.map(k => {
              const c = CLASSES[k]
              return (
                <button
                  key={k}
                  type="button"
                  className={`${styles.classBtn} ${cls === k ? styles.classBtnActive : ''}`}
                  style={{ '--cls-color': c.color }}
                  onClick={() => setCls(k)}
                >
                  <span className={styles.classBtnIcon}>{c.icon}</span>
                  <span className={styles.classBtnLabel}>{t(`classes.${k}`)}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.modalRow}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>{t('create.levelLabel')}</label>
            <input
              className={styles.modalInput}
              type="number"
              value={level}
              min={1} max={99}
              onChange={e => setLevel(e.target.value)}
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>{t('create.heroLevelLabel')}</label>
            <input
              className={styles.modalInput}
              type="number"
              value={heroLevel}
              min={0}
              onChange={e => setHeroLevel(e.target.value)}
            />
          </div>
        </div>

        {error && <div className={styles.modalError}>⚠️ {error}</div>}

        <div className={styles.modalActions}>
          <Button variant="ghost" size="md" onClick={onClose}>{t('create.cancel')}</Button>
          <Button variant="solid" size="md" onClick={handleCreate}>{t('create.submit')}</Button>
        </div>

      </div>
    </div>
  )
}

// ── EquipmentTab ───────────────────────────────────────────────────────────

function EquipmentTab({ char }) {
  const { t } = useLang()
  return (
    <div className={styles.equipTabList}>
      {EQUIP_KEYS.map(key => (
        <div key={key} className={styles.equipTabRow}>
          <span className={styles.equipTabLabel}>{t(`equipKeys.${key}`)}</span>
          {char.equipment[key]
            ? <span className={styles.equipTabFilled}>{char.equipment[key]}</span>
            : <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
          }
        </div>
      ))}
    </div>
  )
}

// ── SPSelect ────────────────────────────────────────────────────────────────

function SPSelect({ spList, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = spList.find(sp => sp.name === value) ?? spList[0]

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className={styles.spSelect} ref={ref}>
      <button type="button" className={styles.spSelectTrigger} onClick={() => setOpen(o => !o)}>
        {selected?.icon && <img src={selected.icon} alt="" className={styles.spSelectIcon} />}
        <span className={styles.spSelectName}>{selected?.name}</span>
        <span className={styles.spSelectArrow}>▾</span>
      </button>
      {open && (
        <div className={styles.spSelectDropdown}>
          {spList.map(sp => (
            <button
              key={sp.name}
              type="button"
              className={`${styles.spSelectOption} ${value === sp.name ? styles.spSelectOptionActive : ''}`}
              onClick={() => { onChange(sp.name); setOpen(false) }}
            >
              <img src={sp.icon} alt="" className={styles.spSelectIcon} />
              <span>{sp.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── AddSPModal ─────────────────────────────────────────────────────────────

function AddSPModal({ charClass, onClose, onAdd }) {
  const { t } = useLang()
  const spList = SPECIALISTS[charClass] ?? []

  const [name,        setName]        = useState(spList[0]?.name ?? '')
  const [improvement, setImprovement] = useState(0)
  const [perfection,  setPerfection]  = useState(0)
  const [statAtk,     setStatAtk]     = useState(0)
  const [statDef,     setStatDef]     = useState(0)
  const [statElem,    setStatElem]    = useState(0)
  const [statHpmp,    setStatHpmp]    = useState(0)
  const [wings,       setWings]       = useState('')

  const handleAdd = () => {
    if (!name) return
    const spData = spList.find(sp => sp.name === name)
    onAdd({
      id:          `sp-${Date.now()}`,
      name,
      icon:        spData?.icon ?? null,
      improvement: Math.max(0, Math.min(20,  parseInt(improvement) || 0)),
      perfection:  Math.max(0, Math.min(100, parseInt(perfection)  || 0)),
      stats: {
        attack:  parseInt(statAtk)  || 0,
        defense: parseInt(statDef)  || 0,
        element: parseInt(statElem) || 0,
        hpmp:    parseInt(statHpmp) || 0,
      },
      wings: wings.trim() || null,
    })
    onClose()
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>

        <h2 className={styles.modalTitle}>{t('sp.modalTitle')}</h2>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t('sp.spLabel')}</label>
          <SPSelect spList={spList} value={name} onChange={setName} />
        </div>

        <div className={styles.modalRow}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>{t('sp.improvement')}</label>
            <input
              className={styles.modalInput}
              type="number"
              value={improvement}
              min={0} max={20}
              onChange={e => setImprovement(e.target.value)}
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>{t('sp.perfection')}</label>
            <input
              className={styles.modalInput}
              type="number"
              value={perfection}
              min={0} max={100}
              onChange={e => setPerfection(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t('sp.statsLabel')}</label>
          <div className={styles.spModalStats}>
            {[
              [t('sp.statAtk'),  statAtk,  setStatAtk],
              [t('sp.statDef'),  statDef,  setStatDef],
              [t('sp.statElem'), statElem, setStatElem],
              [t('sp.statHpmp'), statHpmp, setStatHpmp],
            ].map(([label, val, setter]) => (
              <div key={label}>
                <div className={styles.spModalStatLabel}>{label}</div>
                <input
                  className={styles.modalInput}
                  type="number"
                  value={val}
                  min={0}
                  onChange={e => setter(e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t('sp.wings')}</label>
          <input
            className={styles.modalInput}
            type="text"
            value={wings}
            onChange={e => setWings(e.target.value)}
            placeholder={t('sp.wingsPlaceholder')}
          />
        </div>

        <div className={styles.modalActions}>
          <Button variant="ghost" size="md" onClick={onClose}>{t('create.cancel')}</Button>
          <Button variant="solid" size="md" onClick={handleAdd} disabled={!name}>
            {t('sp.addBtn')}
          </Button>
        </div>

      </div>
    </div>
  )
}

// ── SpecialistsTab ─────────────────────────────────────────────────────────

function SpecialistsTab({ char, onUpdate }) {
  const { t } = useLang()
  const [showAdd, setShowAdd] = useState(false)

  const specialists = char.equipment.specialists ?? []

  const handleAdd = (sp) => {
    onUpdate(char.id, {
      equipment: { ...char.equipment, specialists: [...specialists, sp] },
    })
  }

  const handleDelete = (spId) => {
    onUpdate(char.id, {
      equipment: { ...char.equipment, specialists: specialists.filter(s => s.id !== spId) },
    })
  }

  return (
    <div className={styles.spTab}>
      <div className={styles.spHeader}>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
          {t('sp.addBtn')}
        </Button>
      </div>

      {specialists.length === 0 ? (
        <div className={styles.spEmpty}>{t('sp.empty')}</div>
      ) : (
        <div className={styles.spGrid}>
          {specialists.map(sp => (
            <div key={sp.id} className={styles.spCard}>
              <div className={styles.spCardTop}>
                {sp.icon && <img src={sp.icon} alt="" className={styles.spCardIcon} />}
                <span className={styles.spCardName}>{sp.name}</span>
                <button
                  className={styles.spCardDelete}
                  onClick={() => handleDelete(sp.id)}
                  title="Remove"
                >✕</button>
              </div>
              <div className={styles.spCardBadges}>
                <span className={`${styles.spBadge} ${styles.spBadgeImprove}`}>+{sp.improvement}</span>
                <span className={`${styles.spBadge} ${styles.spBadgePerf}`}>{sp.perfection}%</span>
                {sp.wings && (
                  <span className={`${styles.spBadge} ${styles.spBadgeWings}`}>🪶 {sp.wings}</span>
                )}
              </div>
              <div className={styles.spStats}>
                {[
                  [t('sp.statAtk'),  sp.stats.attack],
                  [t('sp.statDef'),  sp.stats.defense],
                  [t('sp.statElem'), sp.stats.element],
                  [t('sp.statHpmp'), sp.stats.hpmp],
                ].map(([label, val]) => (
                  <div key={label} className={styles.spStatItem}>
                    <span className={styles.spStatLabel}>{label}</span>
                    <span className={styles.spStatVal}>{val || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddSPModal
          charClass={char.class}
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  )
}

// ── FairiesTab ─────────────────────────────────────────────────────────────

function FairiesTab({ char }) {
  const { t } = useLang()
  return (
    <div className={styles.fairyTab}>
      <div className={styles.fairyCard}>
        <div className={styles.fairyCardLabel}>{t('equipKeys.fairy')}</div>
        <div className={`${styles.fairyCardName} ${!char.equipment.fairy ? styles.equipTabEmpty : ''}`}>
          {char.equipment.fairy || t('equipKeys.empty')}
        </div>
      </div>
    </div>
  )
}

// ── BooksTab ───────────────────────────────────────────────────────────────

function BooksTab() {
  const { t } = useLang()
  return (
    <div className={styles.booksTab}>
      <span className={styles.booksTabIcon}>📚</span>
      <p className={styles.booksTabText}>{t('tabs.booksSoon')}</p>
    </div>
  )
}

// ── ProfilePage ────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { isAuthenticated } = useAuth()
  const { t } = useLang()
  const { characters, addCharacter, updateCharacter, loading } = useCharacters()

  const [selectedIdx, setSelectedIdx] = useState(0)
  const [showCreate,  setShowCreate]  = useState(false)
  const [activeTab,   setActiveTab]   = useState('equipment')

  const data = characters[selectedIdx] ?? null
  const cls  = data ? (CLASSES[data.class] ?? CLASSES.Archer) : null

  const TABS = [
    { key: 'equipment',   label: t('tabs.equipment')   },
    { key: 'specialists', label: t('tabs.specialists')  },
    { key: 'fairies',     label: t('tabs.fairies')      },
    { key: 'books',       label: t('tabs.books')        },
  ]

  const handleCreate = (char) => {
    setSelectedIdx(characters.length)
    addCharacter(char)
  }

  // ── Not authenticated ────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className={styles.loginPrompt}>
        <span className={styles.loginPromptIcon}>🔒</span>
        <h2 className={styles.loginPromptTitle}>{t('profile.loginRequired')}</h2>
        <p className={styles.loginPromptSub}>{t('profile.loginRequiredSub')}</p>
        <Link to="/auth?mode=login">
          <Button variant="solid" size="lg">{t('profile.signIn')}</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>

      {/* ── Character Selector ─────────────────────────────────────── */}
      <div className={styles.selectorSection}>
        <h2 className={styles.selectorTitle}>{t('profile.myCharacters')}</h2>
        <div className={styles.selectorGrid}>
          {loading ? (
            Array.from({ length: MAX_CHARS }).map((_, i) => (
              <div key={i} className={`${styles.slot} ${styles.slotSkeleton}`} />
            ))
          ) : Array.from({ length: MAX_CHARS }).map((_, i) => {
            const char    = characters[i]
            const charCls = char ? (CLASSES[char.class] ?? CLASSES.Archer) : null
            const active  = i === selectedIdx && !!char

            if (!char) {
              return (
                <button
                  key={i}
                  className={`${styles.slot} ${styles.slotEmpty}`}
                  onClick={() => setShowCreate(true)}
                >
                  <div className={styles.slotAddIcon}>＋</div>
                  <span className={styles.slotAddLabel}>{t('profile.addCharacter')}</span>
                </button>
              )
            }

            return (
              <button
                key={i}
                className={`${styles.slot} ${active ? styles.slotActive : ''}`}
                onClick={() => { setSelectedIdx(i); setActiveTab('equipment') }}
                style={{ '--cls': charCls.color }}
              >
                {char.prestige > 0 && (
                  <div className={styles.slotPrestige}>
                    {Array.from({ length: char.prestige }).map((_, s) => (
                      <span key={s} className={styles.slotStar}>★</span>
                    ))}
                  </div>
                )}
                <div className={styles.slotAvatar} style={{ borderColor: charCls.color + (active ? 'ff' : '55') }}>
                  {charCls.icon}
                </div>
                <div className={styles.slotName}>{char.name}</div>
                <div className={styles.slotLevels}>
                  <span className={styles.slotLvl}>{t('profile.lv')} {char.level}</span>
                  <span className={styles.slotDot}>·</span>
                  <span className={styles.slotHero}>{t('profile.heroShort')} {char.heroLevel}</span>
                </div>
                <div className={styles.slotClass} style={{ color: charCls.color }}>
                  {t(`classes.${char.class}`)}
                </div>
                {active && <div className={styles.slotActiveBar} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Character detail ───────────────────────────────────────── */}
      {loading ? (
        <div className={styles.detailSkeleton} />
      ) : data ? (
        <div className={styles.detail}>

          <div className={styles.banner}>
            <div className={styles.bannerBg} style={{ '--cls-color': cls.color }} />
            <div className={styles.bannerOverlay} />
            <div className={styles.bannerRune}>{cls.icon}</div>
          </div>

          <div className={styles.header}>
            <div className={styles.avatarWrap}>
              <div className={styles.avatarFrame} style={{ borderColor: cls.color + '88' }}>
                {cls.icon}
              </div>
              <div className={styles.classBadge} style={{ borderColor: cls.color, color: cls.color }}>
                {t(`classes.${data.class}`)}
              </div>
            </div>

            <div className={styles.info}>
              <h1 className={styles.name}>{data.name}</h1>
              <div className={styles.badges}>
                <span className={`${styles.badge} ${styles.badgeMain}`}>{t('profile.lv')} {data.level}</span>
                <span className={`${styles.badge} ${styles.badgeHero}`}>{t('profile.heroLevel')} {data.heroLevel}</span>
              </div>
            </div>

            <div className={styles.actions}>
              <Button variant="primary" size="md">{t('profile.edit')}</Button>
            </div>
          </div>

          <div className={styles.tabBar}>
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                className={`${styles.tabBtn} ${activeTab === key ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.tabPanel}>
            {activeTab === 'equipment'   && <EquipmentTab   char={data} />}
            {activeTab === 'specialists' && <SpecialistsTab char={data} onUpdate={updateCharacter} />}
            {activeTab === 'fairies'     && <FairiesTab     char={data} />}
            {activeTab === 'books'       && <BooksTab />}
          </div>

        </div>
      ) : (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>⚔️</span>
          <p className={styles.emptyText}>{t('profile.noCharacter')}</p>
          <Button variant="solid" size="md" onClick={() => setShowCreate(true)}>
            {t('profile.addCharacter')}
          </Button>
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

    </div>
  )
}
