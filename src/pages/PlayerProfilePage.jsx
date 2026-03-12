import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import { CLASSES, EQUIP_KEYS, WEAPON_RARITIES, SHELL_EFFECTS, SHELL_RANK_COLORS, RUNIC_EFFECTS, RUNIC_COLOR, FAIRY_RUNE_EFFECTS, FAIRY_RUNE_RANK_COLORS, TRAINING_BOOKS, NOSMATES, PARTNER_CLASS_COLORS, PARTNER_SP_RANK_COLORS } from '@/lib/mockData'
import { RAIDS } from '@/lib/raids'
import { formatTime, SERVER_COLORS } from '@/lib/utils'
import { LISTING_STATUS } from '@/lib/market'
import Button from '@/components/ui/Button'
import styles     from './ProfilePage.module.css'
import pageStyles from './PlayerProfilePage.module.css'

// ── Raid helpers ────────────────────────────────────────────────────────────

const RAID_MAP = Object.fromEntries(RAIDS.map(r => [r.slug, r]))

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
      <WeaponSlotRO label={t('equipKeys.gloves')}    w={char.equipment.gloves}    t={t} />
      <WeaponSlotRO label={t('equipKeys.shoes')}     w={char.equipment.shoes}     t={t} />
      <WeaponSlotRO label={t('equipKeys.necklace')}  w={char.equipment.necklace}  t={t} />
      <WeaponSlotRO label={t('equipKeys.ring')}      w={char.equipment.ring}      t={t} />
      <WeaponSlotRO label={t('equipKeys.bracelet')}  w={char.equipment.bracelet}  t={t} />
      {/* Hat row — icon grid display */}
      {(() => {
        const hats = Array.isArray(char.equipment.hat) ? char.equipment.hat : []
        return (
          <div className={styles.equipTabRow}>
            <span className={styles.equipTabLabel}>{t('equipKeys.hat')}</span>
            {hats.length > 0 ? (
              <div className={styles.hatIconRow}>
                {hats.map(h => (
                  <img key={h.name} src={h.icon} alt={h.name} title={h.name} className={styles.hatRowIcon} />
                ))}
              </div>
            ) : (
              <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
            )}
          </div>
        )
      })()}
      {/* Costume icon rows */}
      {[
        ['costumeWings',  t('equipKeys.costumeWings')],
        ['costumeTop',    t('equipKeys.costumeTop')],
        ['costumeBottom', t('equipKeys.costumeBottom')],
        ['costumeWeapon', t('equipKeys.costumeWeapon')],
      ].map(([key, label]) => {
        const items = Array.isArray(char.equipment[key]) ? char.equipment[key] : []
        return (
          <div key={key} className={styles.equipTabRow}>
            <span className={styles.equipTabLabel}>{label}</span>
            {items.length > 0 ? (
              <div className={styles.hatIconRow}>
                {items.map(h => (
                  <img key={h.name} src={h.icon} alt={h.name} title={h.name} className={styles.hatRowIcon} />
                ))}
              </div>
            ) : (
              <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
            )}
          </div>
        )
      })}
      {EQUIP_KEYS.filter(k => k !== 'weapon' && k !== 'offhand' && k !== 'armor' && k !== 'hat' && k !== 'gloves' && k !== 'shoes' && k !== 'necklace' && k !== 'ring' && k !== 'bracelet' && k !== 'costumeWings' && k !== 'costumeTop' && k !== 'costumeBottom' && k !== 'costumeWeapon').map(key => (
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
                <span className={`${styles.spBadge} ${styles.spBadgeWings}`}>
                  <img src={sp.wings.icon} alt="" className={styles.spWingsIcon} />
                  {sp.wings.name}
                </span>
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
  const fairies = Array.isArray(char.equipment.fairies) ? char.equipment.fairies : []

  if (fairies.length === 0) {
    return <div className={styles.spEmpty}>{t('fairy.empty')}</div>
  }

  return (
    <div className={styles.spTab}>
      <div className={styles.spGrid}>
        {fairies.map((f, idx) => (
          <div key={idx} className={styles.spCard}>
            <div className={styles.spCardTop}>
              <img src={f.icon} alt={f.name} className={styles.spCardIcon} />
              <span className={styles.spCardName}>{f.name}</span>
            </div>
            <div className={styles.spCardBadges}>
              <span className={`${styles.spBadge} ${styles.spBadgeImprove}`}>+{f.improvement}</span>
            </div>
            {f.rune?.length > 0 && (
              <div className={styles.fairyRuneEffects}>
                {f.rune.map((eff, i) => {
                  const def   = FAIRY_RUNE_EFFECTS.find(e => e.key === eff.key)
                  const color = FAIRY_RUNE_RANK_COLORS[eff.rank ?? 'C']
                  return (
                    <div key={i} className={styles.fairyRuneEffectRow} style={{ color }}>
                      {def?.label?.replace('X', eff.value) ?? eff.key}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TattoosTab({ char }) {
  const { t } = useLang()
  const tattoos = Array.isArray(char.equipment.tattoos) ? char.equipment.tattoos : []

  if (tattoos.length === 0) {
    return <div className={styles.spEmpty}>{t('tattoo.empty')}</div>
  }

  return (
    <div className={styles.spTab}>
      <div className={styles.tattooCards}>
        {tattoos.map((tattoo, idx) => (
          <div key={idx} className={styles.tattooCard}>
            <div className={styles.tattooCardLeft}>
              <img src={tattoo.icon} alt={tattoo.name} className={styles.tattooCardIcon} />
              <span className={styles.tattooCardName}>{tattoo.name}</span>
            </div>
            <span className={`${styles.spBadge} ${styles.spBadgeImprove}`}>+{tattoo.improvement}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PartnersTab({ char }) {
  const { t } = useLang()
  const partners = Array.isArray(char.equipment.partners) ? char.equipment.partners : []

  if (partners.length === 0) {
    return <div className={styles.spEmpty}>{t('partner.empty')}</div>
  }

  return (
    <div className={styles.partnerCards}>
      {partners.map(p => (
        <div key={p.id} className={styles.partnerCard}>
          <div className={styles.partnerCardTop}>
            <img src={p.icon} alt="" className={styles.partnerCardIcon} />
            <div className={styles.partnerCardInfo}>
              <span className={styles.partnerCardName}>{p.name}</span>
              <span className={styles.partnerClassBadge} style={{ background: PARTNER_CLASS_COLORS[p.class] }}>
                {p.class}
              </span>
            </div>
          </div>
          {p.sp && (
            <div className={styles.partnerSPSection}>
              <div className={styles.partnerSPRow}>
                <img src={p.sp.icon} alt="" className={styles.partnerSPIcon} />
                <span className={styles.nosmateLabel}>{p.sp.name}</span>
              </div>
              <div className={styles.partnerSkills}>
                {p.sp.skills.map((skill, idx) => (
                  <div key={idx} className={styles.partnerSkillRow}>
                    <span className={styles.partnerSkillName}>{skill.name}</span>
                    <span
                      className={styles.partnerRankBtnActive}
                      style={{
                        background: PARTNER_SP_RANK_COLORS[skill.rank],
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.4rem',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >{skill.rank}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function NosmatesTab({ char }) {
  const { t } = useLang()
  const nosmates = Array.isArray(char.equipment.nosmates) ? char.equipment.nosmates : []

  if (nosmates.length === 0) {
    return <div className={styles.spEmpty}>{t('nosmate.empty')}</div>
  }

  return (
    <div className={styles.nosmateCards}>
      {nosmates.map(n => (
        <div key={n.id} className={styles.nosmateCard}>
          <div className={styles.nosmateCardTop}>
            <img src={n.icon} alt="" className={styles.nosmateCardIcon} />
            <span className={styles.nosmateCardName}>{n.name}</span>
          </div>
          <div className={styles.nosmateStarRow}>
            <span className={styles.nosmateLabel}>{t('nosmate.training')}</span>
            <div className={styles.nosmateStars}>
              {[1,2,3,4,5,6].map(s => (
                <span key={s} className={`${styles.nosmateStar} ${s <= n.stars ? styles.nosmateStarFilled : ''}`}>★</span>
              ))}
            </div>
          </div>
          <div className={styles.nosmateInputRow}>
            <div className={styles.nosmateInputGroup}>
              <span className={styles.nosmateLabel}>{t('nosmate.level')}</span>
              <span className={styles.spStatVal}>{n.level}</span>
            </div>
            <div className={styles.nosmateInputGroup}>
              <span className={styles.nosmateLabel}>{t('nosmate.heroLevel')}</span>
              <span className={styles.spStatVal}>{n.heroLevel}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function BooksTab({ char }) {
  const owned = new Set(Array.isArray(char.equipment.books) ? char.equipment.books : [])

  return (
    <div className={styles.booksGrid}>
      {TRAINING_BOOKS.map(book => (
        <div
          key={book.name}
          className={`${styles.bookItem} ${owned.has(book.name) ? styles.bookItemOwned : styles.bookItemLocked}`}
          title={book.name}
        >
          <img src={book.icon} alt="" className={styles.bookIcon} />
          <span className={styles.bookName}>{book.name}</span>
        </div>
      ))}
    </div>
  )
}

// ── PlayerProfilePage ──────────────────────────────────────────────────────

export default function PlayerProfilePage() {
  const { name: usernameParam } = useParams()
  const { isAuthenticated } = useAuth()
  const { t, lang } = useLang()

  const [username,   setUsername]   = useState(null)
  const [profileId,  setProfileId]  = useState(null)
  const [characters, setCharacters] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)

  const [selectedIdx,    setSelectedIdx]    = useState(0)
  const [activeTab,      setActiveTab]      = useState('equipment')
  const [pveRecords,     setPveRecords]     = useState([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [marketListings,        setMarketListings]        = useState([])
  const [marketListingsLoading, setMarketListingsLoading] = useState(false)

  const decoded = decodeURIComponent(usernameParam)

  useEffect(() => {
    if (!hasSupabase) { setLoading(false); setNotFound(true); return }

    setLoading(true)
    setNotFound(false)
    setSelectedIdx(0)
    setActiveTab('equipment')

    supabase
      .from('profiles')
      .select('id, username, characters(*)')
      .ilike('username', decoded)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true)
        } else {
          setUsername(data.username)
          setProfileId(data.id)
          setCharacters(
            [...(data.characters ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(fromDB)
          )
        }
      })
      .finally(() => setLoading(false))
  }, [decoded])

  // Fetch PVE records where player's username appears in team_members
  useEffect(() => {
    if (!username || !hasSupabase) { setPveRecords([]); setRecordsLoading(false); return }
    setRecordsLoading(true)
    supabase
      .from('raid_records')
      .select('id, raid_slug, server, team_members, time_seconds, proof_url, proof_type')
      .eq('status', 'approved')
      .contains('team_members', [username])
      .order('time_seconds', { ascending: true })
      .then(({ data }) => setPveRecords(data ?? []))
      .finally(() => setRecordsLoading(false))
  }, [username])

  // Fetch active market listings for this profile
  useEffect(() => {
    if (!profileId || !hasSupabase) { setMarketListings([]); return }
    setMarketListingsLoading(true)
    supabase
      .from('market_listings')
      .select('id, type, title, server, base_price, buyout_price, tags, last_activity_at')
      .eq('profile_id', profileId)
      .eq('status', LISTING_STATUS.ACTIVE)
      .order('last_activity_at', { ascending: false })
      .then(({ data }) => setMarketListings(data ?? []))
      .finally(() => setMarketListingsLoading(false))
  }, [profileId])

  const TABS = [
    { key: 'equipment',   label: t('tabs.equipment')   },
    { key: 'specialists', label: t('tabs.specialists')  },
    { key: 'fairies',  label: t('tabs.fairies')  },
    { key: 'tattoos',  label: t('tabs.tattoos')  },
    { key: 'nosmates', label: t('tabs.nosmates') },
    { key: 'partners', label: t('tabs.partners') },
    { key: 'books',    label: t('tabs.books')    },
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
            {activeTab === 'fairies'  && <FairiesTab  char={data} />}
            {activeTab === 'tattoos'  && <TattoosTab  char={data} />}
            {activeTab === 'nosmates' && <NosmatesTab  char={data} />}
            {activeTab === 'partners' && <PartnersTab  char={data} />}
            {activeTab === 'books'    && <BooksTab     char={data} />}
          </div>

        </div>
      ) : (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>⚔️</span>
          <p className={styles.emptyText}>{t('profile.noCharacter')}</p>
        </div>
      )}

      {/* ── PVE Records ──────────────────────────────────────────── */}
      <div className={pageStyles.recordsSection}>
        <h3 className={pageStyles.recordsTitle}>⚔️ {t('playerProfile.records')}</h3>
        {recordsLoading ? (
          <div className={pageStyles.recordsSkeleton} />
        ) : pveRecords.length === 0 ? (
          <p className={pageStyles.recordsEmpty}>{t('playerProfile.noRecords')}</p>
        ) : (
          <div className={pageStyles.recordsList}>
            {pveRecords.map(rec => {
              const raid = RAID_MAP[rec.raid_slug]
              const raidName = raid ? (raid[lang] ?? raid.en) : rec.raid_slug
              return (
                <div key={rec.id} className={pageStyles.recordRow}>
                  <span className={pageStyles.recordTime}>{formatTime(rec.time_seconds)}</span>
                  <span className={pageStyles.recordRaid}>{raidName}</span>
                  <span
                    className={pageStyles.recordServer}
                    style={{ color: SERVER_COLORS[rec.server], borderColor: SERVER_COLORS[rec.server] + '55' }}
                  >
                    {t(`raids.server.${rec.server}`)}
                  </span>
                  <span className={pageStyles.recordTeam}>{rec.team_members.join(', ')}</span>
                  <a
                    href={rec.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={pageStyles.recordProof}
                    onClick={e => e.stopPropagation()}
                    title={rec.proof_type}
                  >
                    {rec.proof_type === 'video' ? '🎬' : '📸'}
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Market listings ──────────────────────────────────────── */}
      <div className={pageStyles.recordsSection}>
        <h3 className={pageStyles.recordsTitle}>🏷️ {t('playerProfile.marketListings')}</h3>
        {marketListingsLoading ? (
          <div className={pageStyles.recordsSkeleton} />
        ) : marketListings.length === 0 ? (
          <p className={pageStyles.recordsEmpty}>{t('playerProfile.noMarketListings')}</p>
        ) : (
          <div className={pageStyles.marketList}>
            {marketListings.map(l => (
              <Link key={l.id} to={`/market/${l.id}`} className={pageStyles.marketRow}>
                <span className={pageStyles.marketType}>
                  {l.type === 'sell' ? '🏷️ WTS' : '🔍 WTB'}
                </span>
                <span className={pageStyles.marketTitle}>{l.title}</span>
                <span
                  className={pageStyles.marketServer}
                  style={{
                    color: l.server === 'undercity' ? '#6a5acd' : '#20b2aa',
                    borderColor: (l.server === 'undercity' ? '#6a5acd' : '#20b2aa') + '55',
                  }}
                >
                  {l.server === 'undercity' ? 'Undercity' : 'Dragonveil'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
