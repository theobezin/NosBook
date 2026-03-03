import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { mockAccounts, CLASSES, EQUIP_KEYS } from '@/lib/mockData'
import Button from '@/components/ui/Button'
import styles     from './ProfilePage.module.css'
import pageStyles from './PlayerProfilePage.module.css'

// ── Read-only tab components ───────────────────────────────────────────────

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

  const account = mockAccounts.find(
    a => a.username.toLowerCase() === decodeURIComponent(usernameParam).toLowerCase()
  ) ?? null

  const [selectedIdx, setSelectedIdx] = useState(0)
  const [activeTab,   setActiveTab]   = useState('equipment')

  if (!account) {
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

  const { username, characters } = account
  const data = characters[selectedIdx] ?? null
  const cls  = data ? (CLASSES[data.class] ?? CLASSES.Archer) : null

  const TABS = [
    { key: 'equipment',   label: t('tabs.equipment')   },
    { key: 'specialists', label: t('tabs.specialists')  },
    { key: 'fairies',     label: t('tabs.fairies')      },
    { key: 'books',       label: t('tabs.books')        },
  ]

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
