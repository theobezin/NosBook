import { useState, useRef, useEffect } from 'react'
import { Link }    from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { useCharacters } from '@/hooks/useCharacters'
import { CLASSES, STAT_KEYS, EQUIP_KEYS, SPECIAL_KEYS, SPECIALISTS, WEAPONS, SECONDARY_WEAPONS, ARMORS, HATS, WEAPON_RARITIES, SHELL_EFFECTS, SHELL_RANK_COLORS, RUNIC_EFFECTS, RUNIC_COLOR } from '@/lib/mockData'
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

// ── WeaponModal ────────────────────────────────────────────────────────────

function WeaponModal({ char, onClose, onSelect, weaponsSource = WEAPONS, title, equippedWeapon }) {
  const { t } = useLang()
  const [query, setQuery] = useState('')

  const allWeapons = weaponsSource[char.class] ?? []

  const available = allWeapons.filter(w => {
    if (w.minHero !== null) return char.heroLevel >= w.minHero
    return char.level >= w.minLevel
  })

  const filtered = available.filter(w =>
    w.name.toLowerCase().includes(query.toLowerCase())
  )

  const equipped = equippedWeapon

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>

        <h2 className={styles.modalTitle}>{title ?? t('weapon.selectTitle')}</h2>

        <div className={styles.weaponSearch}>
          <input
            className={styles.modalInput}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('weapon.searchPlaceholder')}
            autoFocus
          />
        </div>

        {filtered.length === 0 ? (
          <div className={styles.weaponEmpty}>{t('weapon.noResults')}</div>
        ) : (
          <div className={styles.weaponList}>
            {filtered.map(w => {
              const isEquipped = equipped?.name === w.name
              return (
                <button
                  key={`${w.name}-${w.minLevel ?? w.minHero}`}
                  type="button"
                  className={`${styles.weaponItem} ${isEquipped ? styles.weaponItemActive : ''}`}
                  onClick={() => { onSelect({ name: w.name, icon: w.icon }); onClose() }}
                >
                  <img src={w.icon} alt="" className={styles.weaponItemIcon} />
                  <span className={styles.weaponItemName}>{w.name}</span>
                  <span className={styles.weaponItemLevel}>
                    {w.minHero !== null
                      ? `${t('weapon.heroReq')} ${w.minHero}`
                      : `${t('weapon.lvReq')} ${w.minLevel}`}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <div className={styles.modalActions}>
          {equipped && (
            <Button variant="ghost" size="md" onClick={() => { onSelect(null); onClose() }}>
              {t('weapon.remove')}
            </Button>
          )}
          <Button variant="ghost" size="md" onClick={onClose}>{t('create.cancel')}</Button>
        </div>

      </div>
    </div>
  )
}

// ── WeaponEnhanceModal ─────────────────────────────────────────────────────

const ENHANCE_ICON = 'https://nosapki.com/images/icons/2620.png'

function WeaponEnhanceModal({ weapon, onClose, onSave }) {
  const { t } = useLang()
  const [rarity,      setRarity]      = useState(weapon.rarity      ?? 'r0')
  const [improvement, setImprovement] = useState(weapon.improvement ?? 0)

  const handleSave = () => {
    onSave({ ...weapon, rarity, improvement })
    onClose()
  }

  const currentRarity = WEAPON_RARITIES.find(r => r.key === rarity)

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>

        <h2 className={styles.modalTitle}>{t('weapon.enhanceTitle')}</h2>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t('weapon.rarityLabel')}</label>
          <div className={styles.rarityGrid}>
            {WEAPON_RARITIES.map(r => (
              <button
                key={r.key}
                type="button"
                className={styles.rarityBtn}
                style={{
                  color: r.color,
                  borderColor:     rarity === r.key ? r.color : 'transparent',
                  backgroundColor: rarity === r.key ? `${r.color}22` : 'transparent',
                }}
                onClick={() => setRarity(r.key)}
              >
                <span className={styles.rarityBtnRank}>{r.rank}</span>
                <span className={styles.rarityBtnLabel}>{r.label || '—'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t('weapon.improvementLabel')}</label>
          <div className={styles.improvementRow}>
            <button
              type="button"
              className={styles.improvementBtn}
              onClick={() => setImprovement(v => Math.max(0, v - 1))}
              disabled={improvement === 0}
            >−</button>
            <span
              className={styles.improvementVal}
              style={{ color: currentRarity?.color }}
            >+{improvement}</span>
            <button
              type="button"
              className={styles.improvementBtn}
              onClick={() => setImprovement(v => Math.min(13, v + 1))}
              disabled={improvement === 13}
            >+</button>
          </div>
        </div>

        <div className={styles.modalActions}>
          <Button variant="ghost" size="md" onClick={onClose}>{t('create.cancel')}</Button>
          <Button variant="solid" size="md" onClick={handleSave}>{t('weapon.saveEnhance')}</Button>
        </div>

      </div>
    </div>
  )
}

// ── WeaponShellModal ───────────────────────────────────────────────────────

const SHELL_ICON  = 'https://nosapki.com/images/icons/574.png'
const RUNIC_ICON  = 'https://nosapki.com/images/icons/4280.png'
const SHELL_MAX   = 8
const RUNIC_MAX   = 9

const SHELL_RANK_ORDER = { C: 0, B: 1, A: 2, S: 3 }

function EffectSelect({ effects, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = effects.find(e => e.key === value) ?? effects[0]

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className={styles.shellEffectSelect} ref={ref}>
      <button type="button" className={styles.shellEffectSelectTrigger} onClick={() => setOpen(o => !o)}>
        <span className={styles.shellEffectSelectName}>{selected?.label}</span>
        <span className={styles.spSelectArrow}>▾</span>
      </button>
      {open && (
        <div className={styles.shellEffectSelectDropdown}>
          {effects.map(e => (
            <button
              key={e.key}
              type="button"
              className={`${styles.shellEffectSelectOption} ${value === e.key ? styles.shellEffectSelectOptionActive : ''}`}
              onClick={() => { onChange(e.key); setOpen(false) }}
            >
              {e.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function WeaponShellModal({ weapon, onClose, onSave }) {
  const { t } = useLang()
  const [effects,   setEffects]   = useState(weapon.shell ?? [])
  const [selEffect, setSelEffect] = useState(SHELL_EFFECTS[0].key)
  const [selRank,   setSelRank]   = useState(Object.keys(SHELL_EFFECTS[0].ranges)[0])
  const [selValue,  setSelValue]  = useState('')

  const currentDef = SHELL_EFFECTS.find(e => e.key === selEffect)
  const availRanks = Object.keys(currentDef?.ranges ?? {})

  const handleEffectChange = (key) => {
    setSelEffect(key)
    const def = SHELL_EFFECTS.find(e => e.key === key)
    setSelRank(Object.keys(def?.ranges ?? {})[0] ?? 'C')
    setSelValue('')
  }

  const handleAdd = () => {
    if (!selRank || selValue === '') return
    setEffects(prev => [...prev, { key: selEffect, rank: selRank, value: Number(selValue) }])
    setSelValue('')
  }

  const handleDelete = (eff) => setEffects(prev => { const i = prev.indexOf(eff); return prev.filter((_, j) => j !== i) })

  const handleSave = () => { onSave({ ...weapon, shell: effects }); onClose() }

  const sorted = [...effects].sort((a, b) => (SHELL_RANK_ORDER[a.rank] ?? 0) - (SHELL_RANK_ORDER[b.rank] ?? 0))

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>

        <h2 className={styles.modalTitle}>
          <img src={SHELL_ICON} alt="" className={styles.shellTitleIcon} />
          {t('weapon.shellTitle')}
        </h2>

        {/* Current effects */}
        <div className={styles.shellEffectsList}>
          {effects.length === 0 ? (
            <div className={styles.shellEmpty}>{t('weapon.shellEmpty')}</div>
          ) : sorted.map((eff, idx) => {
            const def   = SHELL_EFFECTS.find(e => e.key === eff.key)
            const color = SHELL_RANK_COLORS[eff.rank]
            return (
              <div key={idx} className={styles.shellEffectRow} style={{ color }}>
                <span className={styles.shellEffectRank}>{eff.rank}</span>
                <span className={styles.shellEffectLabel}>{def?.label ?? eff.key}</span>
                <span className={styles.shellEffectValue}>{eff.value}</span>
                <button className={styles.shellDeleteBtn} onClick={() => handleDelete(eff)}>✕</button>
              </div>
            )
          })}
        </div>

        {/* Add new effect */}
        {effects.length < SHELL_MAX && (
          <div className={styles.shellAddSection}>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>{t('weapon.shellEffect')}</label>
              <EffectSelect effects={SHELL_EFFECTS} value={selEffect} onChange={handleEffectChange} />
            </div>

            <div className={styles.shellAddRow}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>{t('weapon.shellRank')}</label>
                <div className={styles.rankButtons}>
                  {availRanks.map(r => (
                    <button
                      key={r}
                      type="button"
                      className={styles.rankBtn}
                      style={{
                        color:           SHELL_RANK_COLORS[r],
                        borderColor:     selRank === r ? SHELL_RANK_COLORS[r] : 'transparent',
                        backgroundColor: selRank === r ? `${SHELL_RANK_COLORS[r]}22` : 'transparent',
                      }}
                      onClick={() => setSelRank(r)}
                    >{r}</button>
                  ))}
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>{t('weapon.shellValue')}</label>
                <input
                  className={styles.modalInput}
                  type="number"
                  value={selValue}
                  min={0}
                  onChange={e => setSelValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                />
              </div>
            </div>

            <Button variant="primary" size="sm" onClick={handleAdd} disabled={!selRank || selValue === ''}>
              {t('weapon.shellAdd')}
            </Button>
          </div>
        )}

        <div className={styles.modalActions}>
          <Button variant="ghost" size="md" onClick={onClose}>{t('create.cancel')}</Button>
          <Button variant="solid" size="md" onClick={handleSave}>{t('weapon.saveEnhance')}</Button>
        </div>

      </div>
    </div>
  )
}

// ── WeaponRunicModal ───────────────────────────────────────────────────────

function WeaponRunicModal({ weapon, onClose, onSave }) {
  const { t } = useLang()
  const [effects,   setEffects]   = useState(weapon.runic ?? [])
  const [selEffect, setSelEffect] = useState(RUNIC_EFFECTS[0].key)
  const [selValue,  setSelValue]  = useState('')

  const handleAdd = () => {
    if (selValue === '') return
    setEffects(prev => [...prev, { key: selEffect, value: Number(selValue) }])
    setSelValue('')
  }

  const handleDelete = (eff) => setEffects(prev => { const i = prev.indexOf(eff); return prev.filter((_, j) => j !== i) })

  const handleSave = () => { onSave({ ...weapon, runic: effects }); onClose() }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>

        <h2 className={styles.modalTitle}>
          <img src={RUNIC_ICON} alt="" className={styles.shellTitleIcon} />
          {t('weapon.runicTitle')}
        </h2>

        <div className={styles.shellEffectsList}>
          {effects.length === 0 ? (
            <div className={styles.shellEmpty}>{t('weapon.runicEmpty')}</div>
          ) : effects.map((eff, idx) => {
            const def = RUNIC_EFFECTS.find(e => e.key === eff.key)
            return (
              <div key={idx} className={styles.shellEffectRow} style={{ color: RUNIC_COLOR }}>
                <span className={styles.shellEffectLabel}>{def?.label ?? eff.key}</span>
                <span className={styles.shellEffectValue}>{eff.value}</span>
                <button className={styles.shellDeleteBtn} onClick={() => handleDelete(eff)}>✕</button>
              </div>
            )
          })}
        </div>

        {effects.length < RUNIC_MAX && (
          <div className={styles.shellAddSection}>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>{t('weapon.runicEffect')}</label>
              <EffectSelect effects={RUNIC_EFFECTS} value={selEffect} onChange={setSelEffect} />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>{t('weapon.shellValue')}</label>
              <input
                className={styles.modalInput}
                type="number"
                value={selValue}
                min={0}
                onChange={e => setSelValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              />
            </div>
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={selValue === ''}>
              {t('weapon.shellAdd')}
            </Button>
          </div>
        )}

        <div className={styles.modalActions}>
          <Button variant="ghost" size="md" onClick={onClose}>{t('create.cancel')}</Button>
          <Button variant="solid" size="md" onClick={handleSave}>{t('weapon.saveEnhance')}</Button>
        </div>

      </div>
    </div>
  )
}

// ── HatModal ──────────────────────────────────────────────────────────────

function HatModal({ char, equipped, onClose, onSave }) {
  const { t } = useLang()
  const [selected, setSelected] = useState(equipped ?? [])
  const [query, setQuery] = useState('')

  const available = HATS.filter(h => {
    if (h.minHero !== null) return char.heroLevel >= h.minHero
    return char.level >= h.minLevel
  })

  const filtered = available.filter(h =>
    h.name.toLowerCase().includes(query.toLowerCase())
  )

  const toggle = (hat) => {
    const idx = selected.findIndex(s => s.name === hat.name)
    if (idx >= 0) setSelected(prev => prev.filter((_, i) => i !== idx))
    else setSelected(prev => [...prev, { name: hat.name, icon: hat.icon }])
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>

        <h2 className={styles.modalTitle}>{t('weapon.hatTitle')}</h2>

        <div className={styles.weaponSearch}>
          <input
            className={styles.modalInput}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('weapon.searchPlaceholder')}
            autoFocus
          />
        </div>

        {selected.length > 0 && (
          <div className={styles.hatSelectedRow}>
            {selected.map(h => (
              <img key={h.name} src={h.icon} alt={h.name} title={h.name} className={styles.hatSelectedIcon} />
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className={styles.weaponEmpty}>{t('weapon.noResults')}</div>
        ) : (
          <div className={styles.hatGrid}>
            {filtered.map(h => {
              const isSelected = selected.some(s => s.name === h.name)
              return (
                <button
                  key={h.name}
                  type="button"
                  className={`${styles.hatItem} ${isSelected ? styles.hatItemSelected : ''}`}
                  onClick={() => toggle(h)}
                  title={`${h.name} — ${h.minHero !== null ? `${t('weapon.heroReq')} ${h.minHero}` : `${t('weapon.lvReq')} ${h.minLevel}`}`}
                >
                  <img src={h.icon} alt={h.name} />
                </button>
              )
            })}
          </div>
        )}

        <div className={styles.modalActions}>
          {selected.length > 0 && (
            <Button variant="ghost" size="md" onClick={() => setSelected([])}>
              {t('weapon.remove')}
            </Button>
          )}
          <Button variant="ghost" size="md" onClick={onClose}>{t('create.cancel')}</Button>
          <Button variant="solid" size="md" onClick={() => { onSave(selected); onClose() }}>{t('weapon.saveEnhance')}</Button>
        </div>

      </div>
    </div>
  )
}

// ── EquipmentTab ───────────────────────────────────────────────────────────

// Helper to build the display text for a weapon-like slot
function weaponDisplayInfo(w, rarities) {
  if (!w) return { text: null, rarity: null }
  const rarity  = w.rarity ? rarities.find(r => r.key === w.rarity) : null
  const suffix  = (w.improvement ?? 0) > 0 ? ` +${w.improvement}` : ''
  const prefix  = rarity?.label ? `${rarity.label} : ` : ''
  return { text: `${prefix}${w.name}${suffix}`, rarity }
}

// Reusable weapon card display (shell + runic effects)
function WeaponCard({ w }) {
  if (!w?.shell?.length && !w?.runic?.length) return null
  return (
    <div className={styles.shellCard}>
      {[...w.shell ?? []]
        .sort((a, b) => (SHELL_RANK_ORDER[a.rank] ?? 0) - (SHELL_RANK_ORDER[b.rank] ?? 0))
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
  )
}

function EquipmentTab({ char, onUpdate }) {
  const { t } = useLang()
  const [showWeapon,         setShowWeapon]         = useState(false)
  const [showEnhance,        setShowEnhance]        = useState(false)
  const [showShell,          setShowShell]          = useState(false)
  const [showRunic,          setShowRunic]          = useState(false)
  const [showOffhand,        setShowOffhand]        = useState(false)
  const [showOffhandEnhance, setShowOffhandEnhance] = useState(false)
  const [showOffhandShell,   setShowOffhandShell]   = useState(false)
  const [showArmor,          setShowArmor]          = useState(false)
  const [showArmorEnhance,   setShowArmorEnhance]   = useState(false)
  const [showHat,            setShowHat]            = useState(false)

  const saveWeapon  = (w) => onUpdate(char.id, { equipment: { ...char.equipment, weapon:  w } })
  const saveOffhand = (w) => onUpdate(char.id, { equipment: { ...char.equipment, offhand: w } })
  const saveArmor   = (w) => onUpdate(char.id, { equipment: { ...char.equipment, armor:   w } })
  const saveHat     = (h) => onUpdate(char.id, { equipment: { ...char.equipment, hat:     h } })

  const weapon  = char.equipment.weapon  ?? null
  const offhand = char.equipment.offhand ?? null
  const armor   = char.equipment.armor   ?? null
  const hats    = Array.isArray(char.equipment.hat) ? char.equipment.hat : []

  const { text: weaponText,  rarity: weaponRarity  } = weaponDisplayInfo(weapon,  WEAPON_RARITIES)
  const { text: offhandText, rarity: offhandRarity } = weaponDisplayInfo(offhand, WEAPON_RARITIES)
  const { text: armorText,   rarity: armorRarity   } = weaponDisplayInfo(armor,   WEAPON_RARITIES)

  return (
    <div className={styles.equipTabList}>

      {/* ── Main weapon slot ─────────────────────────────────── */}
      <div
        className={`${styles.equipTabRow} ${styles.equipTabRowClickable}`}
        onClick={() => setShowWeapon(true)}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowWeapon(true) }}
      >
        <span className={styles.equipTabLabel}>{t('equipKeys.weapon')}</span>
        <div className={styles.equipTabRight}>
          {weapon ? (
            <span className={styles.equipTabFilled} style={weaponRarity ? { color: weaponRarity.color } : {}}>
              <img src={weapon.icon} alt="" className={styles.equipTabIcon} />
              {weaponText}
            </span>
          ) : (
            <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
          )}
          {weapon && (
            <>
              <button type="button" className={styles.equipTabEnhanceBtn}
                onClick={e => { e.stopPropagation(); setShowEnhance(true) }} title={t('weapon.enhanceTitle')}>
                <img src={ENHANCE_ICON} alt="" /></button>
              <button type="button"
                className={`${styles.equipTabEnhanceBtn} ${weapon.shell?.length ? styles.equipTabEnhanceBtnActive : ''}`}
                onClick={e => { e.stopPropagation(); setShowShell(true) }} title={t('weapon.shellTitle')}>
                <img src={SHELL_ICON} alt="" /></button>
              <button type="button"
                className={`${styles.equipTabEnhanceBtn} ${weapon.runic?.length ? styles.equipTabRunicBtnActive : ''}`}
                onClick={e => { e.stopPropagation(); setShowRunic(true) }} title={t('weapon.runicTitle')}>
                <img src={RUNIC_ICON} alt="" /></button>
            </>
          )}
          <span className={styles.equipTabEdit}>✏️</span>
        </div>
      </div>
      <WeaponCard w={weapon} />

      {/* ── Secondary weapon (offhand) slot ─────────────────── */}
      <div
        className={`${styles.equipTabRow} ${styles.equipTabRowClickable}`}
        onClick={() => setShowOffhand(true)}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowOffhand(true) }}
      >
        <span className={styles.equipTabLabel}>{t('equipKeys.offhand')}</span>
        <div className={styles.equipTabRight}>
          {offhand ? (
            <span className={styles.equipTabFilled} style={offhandRarity ? { color: offhandRarity.color } : {}}>
              <img src={offhand.icon} alt="" className={styles.equipTabIcon} />
              {offhandText}
            </span>
          ) : (
            <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
          )}
          {offhand && (
            <>
              <button type="button" className={styles.equipTabEnhanceBtn}
                onClick={e => { e.stopPropagation(); setShowOffhandEnhance(true) }} title={t('weapon.enhanceTitle')}>
                <img src={ENHANCE_ICON} alt="" /></button>
              <button type="button"
                className={`${styles.equipTabEnhanceBtn} ${offhand.shell?.length ? styles.equipTabEnhanceBtnActive : ''}`}
                onClick={e => { e.stopPropagation(); setShowOffhandShell(true) }} title={t('weapon.shellTitle')}>
                <img src={SHELL_ICON} alt="" /></button>
            </>
          )}
          <span className={styles.equipTabEdit}>✏️</span>
        </div>
      </div>
      <WeaponCard w={offhand} />

      {/* ── Armor slot ──────────────────────────────────────── */}
      <div
        className={`${styles.equipTabRow} ${styles.equipTabRowClickable}`}
        onClick={() => setShowArmor(true)}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowArmor(true) }}
      >
        <span className={styles.equipTabLabel}>{t('equipKeys.armor')}</span>
        <div className={styles.equipTabRight}>
          {armor ? (
            <span className={styles.equipTabFilled} style={armorRarity ? { color: armorRarity.color } : {}}>
              <img src={armor.icon} alt="" className={styles.equipTabIcon} />
              {armorText}
            </span>
          ) : (
            <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
          )}
          {armor && (
            <button type="button" className={styles.equipTabEnhanceBtn}
              onClick={e => { e.stopPropagation(); setShowArmorEnhance(true) }} title={t('weapon.enhanceTitle')}>
              <img src={ENHANCE_ICON} alt="" />
            </button>
          )}
          <span className={styles.equipTabEdit}>✏️</span>
        </div>
      </div>

      {/* ── Hat slot (multi-select) ─────────────────────────── */}
      <div
        className={`${styles.equipTabRow} ${styles.equipTabRowClickable}`}
        onClick={() => setShowHat(true)}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowHat(true) }}
      >
        <span className={styles.equipTabLabel}>{t('equipKeys.hat')}</span>
        <div className={styles.equipTabRight}>
          {hats.length > 0 ? (
            <div className={styles.hatIconRow}>
              {hats.map(h => (
                <img key={h.name} src={h.icon} alt={h.name} title={h.name} className={styles.hatRowIcon} />
              ))}
            </div>
          ) : (
            <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
          )}
          <span className={styles.equipTabEdit}>✏️</span>
        </div>
      </div>

      {/* ── Other slots — display only ───────────────────────── */}
      {EQUIP_KEYS.filter(k => k !== 'weapon' && k !== 'offhand' && k !== 'armor' && k !== 'hat').map(key => (
        <div key={key} className={styles.equipTabRow}>
          <span className={styles.equipTabLabel}>{t(`equipKeys.${key}`)}</span>
          {char.equipment[key]
            ? <span className={styles.equipTabFilled}>{char.equipment[key]}</span>
            : <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
          }
        </div>
      ))}

      {showWeapon         && <WeaponModal char={char} onClose={() => setShowWeapon(false)}  onSelect={saveWeapon}  equippedWeapon={weapon} />}
      {showEnhance        && weapon  && <WeaponEnhanceModal weapon={weapon}  onClose={() => setShowEnhance(false)}        onSave={saveWeapon}  />}
      {showShell          && weapon  && <WeaponShellModal   weapon={weapon}  onClose={() => setShowShell(false)}           onSave={saveWeapon}  />}
      {showRunic          && weapon  && <WeaponRunicModal   weapon={weapon}  onClose={() => setShowRunic(false)}            onSave={saveWeapon}  />}
      {showOffhand        && <WeaponModal char={char} onClose={() => setShowOffhand(false)} onSelect={saveOffhand} equippedWeapon={offhand} weaponsSource={SECONDARY_WEAPONS} title={t('weapon.offhandTitle')} />}
      {showOffhandEnhance && offhand && <WeaponEnhanceModal weapon={offhand} onClose={() => setShowOffhandEnhance(false)} onSave={saveOffhand} />}
      {showOffhandShell   && offhand && <WeaponShellModal   weapon={offhand} onClose={() => setShowOffhandShell(false)}   onSave={saveOffhand} />}
      {showArmor        && <WeaponModal char={char} onClose={() => setShowArmor(false)} onSelect={saveArmor} equippedWeapon={armor} weaponsSource={ARMORS} title={t('weapon.armorTitle')} />}
      {showArmorEnhance && armor && <WeaponEnhanceModal weapon={armor} onClose={() => setShowArmorEnhance(false)} onSave={saveArmor} />}
      {showHat          && <HatModal char={char} equipped={hats} onClose={() => setShowHat(false)} onSave={saveHat} />}
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
            {activeTab === 'equipment'   && <EquipmentTab   char={data} onUpdate={updateCharacter} />}
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
