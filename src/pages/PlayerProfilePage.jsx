import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import { CLASSES, EQUIP_KEYS, WEAPON_RARITIES, SHELL_EFFECTS, SHELL_RANK_COLORS, RUNIC_EFFECTS, RUNIC_COLOR } from '@/lib/mockData'
import Button from '@/components/ui/Button'
import styles     from './ProfilePage.module.css'
import pageStyles from './PlayerProfilePage.module.css'

// ── DB mapping ─────────────────────────────────────────────────────────────

function fromDB(row) {
  return {
    id:          row.id,
    name:        row.name,
    class:       row.class,
    level:       row.level,
    heroLevel:   row.hero_level,
    prestige:    row.prestige,
    element:     row.element,
    stats:       row.stats       ?? {},
    equipment:   row.equipment   ?? {},
    resistances: row.resistances ?? {},
  }
}

// ── Read-only tab components ───────────────────────────────────────────────

const RANK_ORDER_RO = { C: 0, B: 1, A: 2, S: 3 }

function WeaponSlotRO({ label, w, t }) {
  const rarity = w?.rarity ? WEAPON_RARITIES.find(r => r.key === w.rarity) : null
  const suffix = (w?.improvement ?? 0) > 0 ? ` +${w.improvement}` : ''
  const prefix = rarity?.label ? `${rarity.label} : ` : ''
  const text   = w ? `${prefix}${w.name}${suffix}` : null

  return (
    <>
      <div className={styles.equipTabRow}>
        <span className={styles.equipTabLabel}>{label}</span>
        {text ? (
          <span className={styles.equipTabFilled} style={rarity ? { color: rarity.color } : {}}>
            <img src={w.icon} alt="" className={styles.equipTabIcon} />
            {text}
          </span>
        ) : (
          <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
        )}
      </div>
      {(w?.shell?.length > 0 || w?.runic?.length > 0) && (
        <div className={styles.shellCard}>
          {[...w.shell ?? []]
            .sort((a, b) => (RANK_ORDER_RO[a.rank] ?? 0) - (RANK_ORDER_RO[b.rank] ?? 0))
            .map((eff, idx) => {
              const def   = SHELL_EFFECTS.find(e => e.key === eff.key)
              const color = SHELL_RANK_COLORS[eff.rank]
              return (
                <div key={`s${idx}`} className={styles.shellCardLine} style={{ color }}>
                  {eff.rank}-{def?.label ?? eff.key} : {eff.value}
                </div>
              )
            })}
          {w.shell?.length > 0 && w.runic?.length > 0 && <div className={styles.shellCardDivider} />}
          {(w.runic ?? []).map((eff, idx) => {
            const def = RUNIC_EFFECTS.find(e => e.key === eff.key)
            return (
              <div key={`r${idx}`} className={styles.shellCardLine} style={{ color: RUNIC_COLOR }}>
                ✦ {def?.label ?? eff.key} : {eff.value}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function EquipmentTab({ char }) {
  const { t } = useLang()
  return (
    <div className={styles.equipTabList}>
      <WeaponSlotRO label={t('equipKeys.weapon')}  w={char.equipment.weapon}  t={t} />
      <WeaponSlotRO label={t('equipKeys.offhand')} w={char.equipment.offhand} t={t} />
      <WeaponSlotRO label={t('equipKeys.armor')}   w={char.equipment.armor}   t={t} />
      {EQUIP_KEYS.filter(k => k !== 'weapon' && k !== 'offhand' && k !== 'armor').map(key => (
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

function SpecialistsTab({ char }) {
  const { t } = useLang()
  const specialists = char.equipment.specialists ?? []

  if (specialists.length === 0) {
    return <div className={styles.spEmpty}>{t('sp.empty')}</div>
  }

  return (
    <div className={styles.spTab}>
      <div className={styles.spGrid}>
        {specialists.map(sp => (
          <div key={sp.id} className={styles.spCard}>
            <div className={styles.spCardTop}>
              {sp.icon && <img src={sp.icon} alt="" className={styles.spCardIcon} />}
              <span className={styles.spCardName}>{sp.name}</span>
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
    </div>
  )
}

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

function BooksTab() {
  const { t } = useLang()
  return (
    <div className={styles.booksTab}>
      <span className={styles.booksTabIcon}>📚</span>
      <p className={styles.booksTabText}>{t('tabs.booksSoon')}</p>
    </div>
  )
}

// ── PlayerProfilePage ──────────────────────────────────────────────────────

export default function PlayerProfilePage() {
  const { name: usernameParam } = useParams()
  const { isAuthenticated } = useAuth()
  const { t } = useLang()

  const [username,   setUsername]   = useState(null)
  const [characters, setCharacters] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)

  const [selectedIdx, setSelectedIdx] = useState(0)
  const [activeTab,   setActiveTab]   = useState('equipment')

  const decoded = decodeURIComponent(usernameParam)

  useEffect(() => {
    if (!hasSupabase) { setLoading(false); setNotFound(true); return }

    setLoading(true)
    setNotFound(false)
    setSelectedIdx(0)
    setActiveTab('equipment')

    supabase
      .from('profiles')
      .select('username, characters(*)')
      .ilike('username', decoded)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true)
        } else {
          setUsername(data.username)
          setCharacters(
            [...(data.characters ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(fromDB)
          )
        }
      })
      .finally(() => setLoading(false))
  }, [decoded])

  const TABS = [
    { key: 'equipment',   label: t('tabs.equipment')   },
    { key: 'specialists', label: t('tabs.specialists')  },
    { key: 'fairies',     label: t('tabs.fairies')      },
    { key: 'books',       label: t('tabs.books')        },
  ]

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={pageStyles.backRow}>
          <Link to="/players">
            <Button variant="ghost" size="sm">{t('players.back')}</Button>
          </Link>
        </div>
        <div className={styles.selectorSection}>
          <div className={styles.selectorGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${styles.slot} ${styles.slotSkeleton}`} />
            ))}
          </div>
        </div>
        <div className={styles.detailSkeleton} />
      </div>
    )
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className={pageStyles.notFoundPage}>
        <div className={pageStyles.notFoundIcon}>🔍</div>
        <h1 className={pageStyles.notFoundTitle}>{t('players.notFound')}</h1>
        <p className={pageStyles.notFoundSub}>{t('players.notFoundSub')}</p>
        <Link to="/players">
          <Button variant="ghost" size="md">{t('players.back')}</Button>
        </Link>
      </div>
    )
  }

  const data = characters[selectedIdx] ?? null
  const cls  = data ? (CLASSES[data.class] ?? CLASSES.Archer) : null

  return (
    <div className={styles.page}>

      <div className={pageStyles.backRow}>
        <Link to="/players">
          <Button variant="ghost" size="sm">{t('players.back')}</Button>
        </Link>
      </div>

      {/* ── Account header ─────────────────────────────────────────── */}
      <div className={styles.selectorSection}>
        <h2 className={styles.selectorTitle}>
          👤 {username}
          <span className={pageStyles.charCount}>
            {characters.length} {t('players.chars')}
          </span>
        </h2>

        <div className={styles.selectorGrid}>
          {Array.from({ length: 4 }).map((_, i) => {
            const char    = characters[i]
            const charCls = char ? (CLASSES[char.class] ?? CLASSES.Archer) : null
            const active  = i === selectedIdx && !!char

            if (!char) {
              return (
                <div key={i} className={`${styles.slot} ${styles.slotEmpty} ${pageStyles.slotReadOnly}`}>
                  <div className={styles.slotAddIcon} style={{ opacity: 0.25 }}>○</div>
                </div>
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
      {data ? (
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
              {isAuthenticated
                ? <Button variant="ghost" size="md">{t('profile.addFriend')}</Button>
                : <Link to="/auth?mode=login"><Button variant="solid" size="md">{t('profile.signIn')}</Button></Link>
              }
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
        </div>
      )}

    </div>
  )
}
