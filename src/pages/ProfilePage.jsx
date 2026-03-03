import { useState } from 'react'
import { Link }    from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { useCharacters } from '@/hooks/useCharacters'
import { CLASSES, STAT_KEYS, EQUIP_KEYS, SPECIAL_KEYS } from '@/lib/mockData'
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
    equipment:   Object.fromEntries([...EQUIP_KEYS, ...SPECIAL_KEYS].map(k => [k, null])),
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

// ── SpecialistsTab ─────────────────────────────────────────────────────────

function SpecialistsTab({ char }) {
  const { t } = useLang()
  return (
    <div className={styles.spTab}>
      <div className={styles.spCard}>
        <div className={styles.spCardLabel}>{t('equipKeys.sp')}</div>
        <div className={`${styles.spCardName} ${!char.equipment.sp ? styles.equipTabEmpty : ''}`}>
          {char.equipment.sp || t('equipKeys.empty')}
        </div>
      </div>
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
  const { characters, addCharacter, loading } = useCharacters()

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
            {activeTab === 'specialists' && <SpecialistsTab char={data} />}
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
