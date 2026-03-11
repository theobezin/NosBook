import { useState, useRef, useEffect } from 'react'
import { Link }    from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { useCharacters } from '@/hooks/useCharacters'
import { CLASSES, STAT_KEYS, EQUIP_KEYS, SPECIAL_KEYS, SPECIALISTS, SP_WINGS, WEAPONS, SECONDARY_WEAPONS, ARMORS, HATS, GLOVES, SHOES, NECKLACES, RINGS, BRACELETS, COSTUME_WINGS, COSTUME_TOPS, COSTUME_BOTTOMS, COSTUME_WEAPONS, FAIRIES, FAIRY_RUNE_EFFECTS, FAIRY_RUNE_RANK_COLORS, TATTOOS, NOSMATES, PARTNERS, PARTNER_SPECIALISTS, PARTNER_CLASS_COLORS, PARTNER_SP_RANKS, PARTNER_SP_RANK_COLORS, TRAINING_BOOKS, WEAPON_RARITIES, SHELL_EFFECTS, SHELL_RANK_COLORS, RUNIC_EFFECTS, RUNIC_COLOR } from '@/lib/mockData'
import { supabase, hasSupabase } from '@/lib/supabase'
import { SERVER_COLORS } from '@/lib/utils'
import Button from '@/components/ui/Button'
import styles from './ProfilePage.module.css'

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_CHARS = 4

function makeCharacter(name, cls, level, heroLevel, server) {
  return {
    id:          `char-${Date.now()}`,
    name:        name.trim(),
    server:      server ?? null,
    class:       cls,
    level:       Math.max(1, Math.min(99, parseInt(level) || 1)),
    heroLevel:   Math.max(0, parseInt(heroLevel) || 0),
    prestige:    0,
    element:     'Neutral',
    stats:       Object.fromEntries(STAT_KEYS.map(k => [k, null])),
    equipment:   {
      ...Object.fromEntries([...EQUIP_KEYS, ...SPECIAL_KEYS].map(k => [k, null])),
      specialists: [],
      fairies:     [],
      tattoos:     [],
      nosmates:    [],
      partners:    [],
      books:       [],
    },
    resistances: { fire: 0, water: 0, light: 0, shadow: 0 },
  }
}

// ── CreateModal ────────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreate, server }) {
  const { t } = useLang()
  const [name,       setName]       = useState('')
  const [cls,        setCls]        = useState('Archer')
  const [level,      setLevel]      = useState('99')
  const [heroLevel,  setHeroLevel]  = useState('0')
  const [error,      setError]      = useState('')
  const [submitting, setSubmitting] = useState(false)

  const CLASS_KEYS = Object.keys(CLASSES)

  const handleCreate = async () => {
    if (!name.trim())                    { setError(t('create.errName'));    return }
    if (name.trim().length < 3)          { setError(t('create.errNameLen')); return }
    const lvl = parseInt(level)
    if (!lvl || lvl < 1 || lvl > 99)    { setError(t('create.errLevel'));   return }
    setSubmitting(true)
    const result = await onCreate(makeCharacter(name, cls, lvl, heroLevel, server))
    setSubmitting(false)
    if (result?.error) {
      if (result.error.code === '23505') {
        setError(t('create.errNameExists'))
      } else {
        setError(result.error.message ?? t('create.errName'))
      }
    } else {
      onClose()
    }
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
          <Button variant="ghost" size="md" onClick={onClose} disabled={submitting}>{t('create.cancel')}</Button>
          <Button variant="solid" size="md" onClick={handleCreate} disabled={submitting}>
            {submitting ? '…' : t('create.submit')}
          </Button>
        </div>

      </div>
    </div>
  )
}

// ── WeaponModal ────────────────────────────────────────────────────────────

function WeaponModal({ char, onClose, onSelect, weaponsSource = WEAPONS, title, equippedWeapon }) {
  const { t } = useLang()
  const [query, setQuery] = useState('')

  const allWeapons = Array.isArray(weaponsSource) ? weaponsSource : (weaponsSource[char.class] ?? [])

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

// ── MultiSelectModal ──────────────────────────────────────────────────────

function MultiSelectModal({ title, items, char, equipped, onClose, onSave }) {
  const { t } = useLang()
  const [selected, setSelected] = useState(equipped ?? [])
  const [query, setQuery] = useState('')

  const available = items.filter(h => {
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

        <h2 className={styles.modalTitle}>{title}</h2>

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
  const [showGloves,         setShowGloves]         = useState(false)
  const [showGlovesEnhance,  setShowGlovesEnhance]  = useState(false)
  const [showShoes,          setShowShoes]          = useState(false)
  const [showShoesEnhance,   setShowShoesEnhance]   = useState(false)
  const [showNecklace,       setShowNecklace]       = useState(false)
  const [showRing,           setShowRing]           = useState(false)
  const [showBracelet,       setShowBracelet]       = useState(false)
  const [showCostumeWings,   setShowCostumeWings]   = useState(false)
  const [showCostumeTop,     setShowCostumeTop]     = useState(false)
  const [showCostumeBottom,  setShowCostumeBottom]  = useState(false)
  const [showCostumeWeapon,  setShowCostumeWeapon]  = useState(false)

  const saveWeapon  = (w) => onUpdate(char.id, { equipment: { ...char.equipment, weapon:  w } })
  const saveOffhand = (w) => onUpdate(char.id, { equipment: { ...char.equipment, offhand: w } })
  const saveArmor   = (w) => onUpdate(char.id, { equipment: { ...char.equipment, armor:   w } })
  const saveHat     = (h) => onUpdate(char.id, { equipment: { ...char.equipment, hat:     h } })
  const saveGloves   = (w) => onUpdate(char.id, { equipment: { ...char.equipment, gloves:   w } })
  const saveShoes    = (w) => onUpdate(char.id, { equipment: { ...char.equipment, shoes:    w } })
  const saveNecklace = (w) => onUpdate(char.id, { equipment: { ...char.equipment, necklace: w } })
  const saveRing     = (w) => onUpdate(char.id, { equipment: { ...char.equipment, ring:     w } })
  const saveBracelet     = (w) => onUpdate(char.id, { equipment: { ...char.equipment, bracelet:      w } })
  const saveCostumeWings = (h) => onUpdate(char.id, { equipment: { ...char.equipment, costumeWings: h } })
  const saveCostumeTop   = (h) => onUpdate(char.id, { equipment: { ...char.equipment, costumeTop:   h } })
  const saveCostumeBottom = (h) => onUpdate(char.id, { equipment: { ...char.equipment, costumeBottom: h } })
  const saveCostumeWeapon = (h) => onUpdate(char.id, { equipment: { ...char.equipment, costumeWeapon: h } })

  const weapon  = char.equipment.weapon  ?? null
  const offhand = char.equipment.offhand ?? null
  const armor   = char.equipment.armor   ?? null
  const hats    = Array.isArray(char.equipment.hat) ? char.equipment.hat : []
  const gloves    = char.equipment.gloves    ?? null
  const shoes     = char.equipment.shoes     ?? null
  const necklace  = char.equipment.necklace  ?? null
  const ring      = char.equipment.ring      ?? null
  const bracelet      = char.equipment.bracelet      ?? null
  const costumeWings  = Array.isArray(char.equipment.costumeWings)  ? char.equipment.costumeWings  : []
  const costumeTop    = Array.isArray(char.equipment.costumeTop)    ? char.equipment.costumeTop    : []
  const costumeBottom  = Array.isArray(char.equipment.costumeBottom)  ? char.equipment.costumeBottom  : []
  const costumeWeapon  = Array.isArray(char.equipment.costumeWeapon)  ? char.equipment.costumeWeapon  : []

  const { text: weaponText,  rarity: weaponRarity  } = weaponDisplayInfo(weapon,  WEAPON_RARITIES)
  const { text: offhandText, rarity: offhandRarity } = weaponDisplayInfo(offhand, WEAPON_RARITIES)
  const { text: armorText,   rarity: armorRarity   } = weaponDisplayInfo(armor,   WEAPON_RARITIES)
  const { text: glovesText,  rarity: glovesRarity  } = weaponDisplayInfo(gloves,  WEAPON_RARITIES)
  const { text: shoesText,   rarity: shoesRarity   } = weaponDisplayInfo(shoes,   WEAPON_RARITIES)

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

      {/* ── Gloves slot ─────────────────────────────────────── */}
      <div
        className={`${styles.equipTabRow} ${styles.equipTabRowClickable}`}
        onClick={() => setShowGloves(true)}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowGloves(true) }}
      >
        <span className={styles.equipTabLabel}>{t('equipKeys.gloves')}</span>
        <div className={styles.equipTabRight}>
          {gloves ? (
            <span className={styles.equipTabFilled} style={glovesRarity ? { color: glovesRarity.color } : {}}>
              <img src={gloves.icon} alt="" className={styles.equipTabIcon} />
              {glovesText}
            </span>
          ) : (
            <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
          )}
          <span className={styles.equipTabEdit}>✏️</span>
        </div>
      </div>

      {/* ── Shoes slot ──────────────────────────────────────── */}
      <div
        className={`${styles.equipTabRow} ${styles.equipTabRowClickable}`}
        onClick={() => setShowShoes(true)}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowShoes(true) }}
      >
        <span className={styles.equipTabLabel}>{t('equipKeys.shoes')}</span>
        <div className={styles.equipTabRight}>
          {shoes ? (
            <span className={styles.equipTabFilled} style={shoesRarity ? { color: shoesRarity.color } : {}}>
              <img src={shoes.icon} alt="" className={styles.equipTabIcon} />
              {shoesText}
            </span>
          ) : (
            <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
          )}
          <span className={styles.equipTabEdit}>✏️</span>
        </div>
      </div>

      {/* ── Necklace slot ───────────────────────────────────── */}
      <div
        className={`${styles.equipTabRow} ${styles.equipTabRowClickable}`}
        onClick={() => setShowNecklace(true)}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowNecklace(true) }}
      >
        <span className={styles.equipTabLabel}>{t('equipKeys.necklace')}</span>
        <div className={styles.equipTabRight}>
          {necklace ? (
            <span className={styles.equipTabFilled}>
              <img src={necklace.icon} alt="" className={styles.equipTabIcon} />
              {necklace.name}
            </span>
          ) : (
            <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
          )}
          <span className={styles.equipTabEdit}>✏️</span>
        </div>
      </div>

      {/* ── Ring slot ───────────────────────────────────────── */}
      <div
        className={`${styles.equipTabRow} ${styles.equipTabRowClickable}`}
        onClick={() => setShowRing(true)}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowRing(true) }}
      >
        <span className={styles.equipTabLabel}>{t('equipKeys.ring')}</span>
        <div className={styles.equipTabRight}>
          {ring ? (
            <span className={styles.equipTabFilled}>
              <img src={ring.icon} alt="" className={styles.equipTabIcon} />
              {ring.name}
            </span>
          ) : (
            <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
          )}
          <span className={styles.equipTabEdit}>✏️</span>
        </div>
      </div>

      {/* ── Bracelet slot ───────────────────────────────────── */}
      <div
        className={`${styles.equipTabRow} ${styles.equipTabRowClickable}`}
        onClick={() => setShowBracelet(true)}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowBracelet(true) }}
      >
        <span className={styles.equipTabLabel}>{t('equipKeys.bracelet')}</span>
        <div className={styles.equipTabRight}>
          {bracelet ? (
            <span className={styles.equipTabFilled}>
              <img src={bracelet.icon} alt="" className={styles.equipTabIcon} />
              {bracelet.name}
            </span>
          ) : (
            <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
          )}
          <span className={styles.equipTabEdit}>✏️</span>
        </div>
      </div>

      {/* ── Costume Wings slot ──────────────────────────────────── */}
      <div
        className={`${styles.equipTabRow} ${styles.equipTabRowClickable}`}
        onClick={() => setShowCostumeWings(true)}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowCostumeWings(true) }}
      >
        <span className={styles.equipTabLabel}>{t('equipKeys.costumeWings')}</span>
        <div className={styles.equipTabRight}>
          {costumeWings.length > 0 ? (
            <div className={styles.hatIconRow}>
              {costumeWings.map(h => (
                <img key={h.name} src={h.icon} alt={h.name} title={h.name} className={styles.hatRowIcon} />
              ))}
            </div>
          ) : (
            <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
          )}
          <span className={styles.equipTabEdit}>✏️</span>
        </div>
      </div>

      {/* ── Costume Top slot ──────────────────────────────────────── */}
      <div
        className={`${styles.equipTabRow} ${styles.equipTabRowClickable}`}
        onClick={() => setShowCostumeTop(true)}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowCostumeTop(true) }}
      >
        <span className={styles.equipTabLabel}>{t('equipKeys.costumeTop')}</span>
        <div className={styles.equipTabRight}>
          {costumeTop.length > 0 ? (
            <div className={styles.hatIconRow}>
              {costumeTop.map(h => (
                <img key={h.name} src={h.icon} alt={h.name} title={h.name} className={styles.hatRowIcon} />
              ))}
            </div>
          ) : (
            <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
          )}
          <span className={styles.equipTabEdit}>✏️</span>
        </div>
      </div>

      {/* ── Costume Bottom slot ───────────────────────────────────── */}
      <div
        className={`${styles.equipTabRow} ${styles.equipTabRowClickable}`}
        onClick={() => setShowCostumeBottom(true)}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowCostumeBottom(true) }}
      >
        <span className={styles.equipTabLabel}>{t('equipKeys.costumeBottom')}</span>
        <div className={styles.equipTabRight}>
          {costumeBottom.length > 0 ? (
            <div className={styles.hatIconRow}>
              {costumeBottom.map(h => (
                <img key={h.name} src={h.icon} alt={h.name} title={h.name} className={styles.hatRowIcon} />
              ))}
            </div>
          ) : (
            <span className={styles.equipTabEmpty}>{t('equipKeys.empty')}</span>
          )}
          <span className={styles.equipTabEdit}>✏️</span>
        </div>
      </div>

      {/* ── Costume Weapon slot ──────────────────────────────────── */}
      <div
        className={`${styles.equipTabRow} ${styles.equipTabRowClickable}`}
        onClick={() => setShowCostumeWeapon(true)}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowCostumeWeapon(true) }}
      >
        <span className={styles.equipTabLabel}>{t('equipKeys.costumeWeapon')}</span>
        <div className={styles.equipTabRight}>
          {costumeWeapon.length > 0 ? (
            <div className={styles.hatIconRow}>
              {costumeWeapon.map(h => (
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
      {EQUIP_KEYS.filter(k => k !== 'weapon' && k !== 'offhand' && k !== 'armor' && k !== 'hat' && k !== 'gloves' && k !== 'shoes' && k !== 'necklace' && k !== 'ring' && k !== 'bracelet' && k !== 'costumeWings' && k !== 'costumeTop' && k !== 'costumeBottom' && k !== 'costumeWeapon').map(key => (
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
      {showHat          && <MultiSelectModal title={t('weapon.hatTitle')} items={HATS} char={char} equipped={hats} onClose={() => setShowHat(false)} onSave={saveHat} />}
      {showGloves        && <WeaponModal char={char} onClose={() => setShowGloves(false)} onSelect={saveGloves} equippedWeapon={gloves} weaponsSource={GLOVES} title={t('weapon.glovesTitle')} />}
      {showGlovesEnhance && gloves && <WeaponEnhanceModal weapon={gloves} onClose={() => setShowGlovesEnhance(false)} onSave={saveGloves} />}
      {showShoes         && <WeaponModal char={char} onClose={() => setShowShoes(false)} onSelect={saveShoes} equippedWeapon={shoes} weaponsSource={SHOES} title={t('weapon.shoesTitle')} />}
      {showShoesEnhance  && shoes  && <WeaponEnhanceModal weapon={shoes}  onClose={() => setShowShoesEnhance(false)}  onSave={saveShoes}  />}
      {showNecklace  && <WeaponModal char={char} onClose={() => setShowNecklace(false)}  onSelect={saveNecklace}  equippedWeapon={necklace}  weaponsSource={NECKLACES} title={t('weapon.necklaceTitle')} />}
      {showRing      && <WeaponModal char={char} onClose={() => setShowRing(false)}      onSelect={saveRing}      equippedWeapon={ring}      weaponsSource={RINGS}     title={t('weapon.ringTitle')} />}
      {showBracelet      && <WeaponModal char={char} onClose={() => setShowBracelet(false)}      onSelect={saveBracelet}      equippedWeapon={bracelet}  weaponsSource={BRACELETS}      title={t('weapon.braceletTitle')} />}
      {showCostumeWings  && <MultiSelectModal title={t('weapon.costumeWingsTitle')}  items={COSTUME_WINGS}  char={char} equipped={costumeWings}  onClose={() => setShowCostumeWings(false)}  onSave={saveCostumeWings} />}
      {showCostumeTop    && <MultiSelectModal title={t('weapon.costumeTopTitle')}    items={COSTUME_TOPS}   char={char} equipped={costumeTop}    onClose={() => setShowCostumeTop(false)}    onSave={saveCostumeTop} />}
      {showCostumeBottom  && <MultiSelectModal title={t('weapon.costumeBottomTitle')}  items={COSTUME_BOTTOMS}  char={char} equipped={costumeBottom}  onClose={() => setShowCostumeBottom(false)}  onSave={saveCostumeBottom} />}
      {showCostumeWeapon  && <MultiSelectModal title={t('weapon.costumeWeaponTitle')}  items={COSTUME_WEAPONS[char.class] ?? []}  char={char} equipped={costumeWeapon}  onClose={() => setShowCostumeWeapon(false)}  onSave={saveCostumeWeapon} />}
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

// ── WingsSelect ────────────────────────────────────────────────────────────

function WingsSelect({ value, onChange }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className={styles.spSelect} ref={ref}>
      <button type="button" className={styles.spSelectTrigger} onClick={() => setOpen(o => !o)}>
        {value
          ? <><img src={value.icon} alt="" className={styles.spSelectIcon} /><span className={styles.spSelectName}>{value.name}</span></>
          : <span className={styles.spSelectName}>{t('sp.wingsNone')}</span>
        }
        <span className={styles.spSelectArrow}>▾</span>
      </button>
      {open && (
        <div className={styles.spSelectDropdown}>
          <button
            type="button"
            className={`${styles.spSelectOption} ${!value ? styles.spSelectOptionActive : ''}`}
            onClick={() => { onChange(null); setOpen(false) }}
          >
            <span>{t('sp.wingsNone')}</span>
          </button>
          {SP_WINGS.map(w => (
            <button
              key={w.name}
              type="button"
              className={`${styles.spSelectOption} ${value?.name === w.name ? styles.spSelectOptionActive : ''}`}
              onClick={() => { onChange(w); setOpen(false) }}
            >
              <img src={w.icon} alt="" className={styles.spSelectIcon} />
              <span>{w.name}</span>
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
  const [wings,       setWings]       = useState(null)

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
      wings: wings ?? null,
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
          <WingsSelect value={wings} onChange={setWings} />
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

// ── EditSPModal ────────────────────────────────────────────────────────────

function EditSPModal({ charClass, sp, onClose, onSave }) {
  const { t } = useLang()
  const spList = SPECIALISTS[charClass] ?? []

  const [name,        setName]        = useState(sp.name)
  const [improvement, setImprovement] = useState(String(sp.improvement))
  const [perfection,  setPerfection]  = useState(String(sp.perfection))
  const [statAtk,     setStatAtk]     = useState(String(sp.stats.attack))
  const [statDef,     setStatDef]     = useState(String(sp.stats.defense))
  const [statElem,    setStatElem]    = useState(String(sp.stats.element))
  const [statHpmp,    setStatHpmp]    = useState(String(sp.stats.hpmp))
  const [wings,       setWings]       = useState(sp.wings ?? null)

  const handleSave = () => {
    if (!name) return
    const spData = spList.find(s => s.name === name)
    onSave({
      ...sp,
      name,
      icon:        spData?.icon ?? sp.icon,
      improvement: Math.max(0, Math.min(20,  parseInt(improvement) || 0)),
      perfection:  Math.max(0, Math.min(100, parseInt(perfection)  || 0)),
      stats: {
        attack:  parseInt(statAtk)  || 0,
        defense: parseInt(statDef)  || 0,
        element: parseInt(statElem) || 0,
        hpmp:    parseInt(statHpmp) || 0,
      },
      wings: wings ?? null,
    })
    onClose()
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>

        <h2 className={styles.modalTitle}>{t('sp.editModalTitle')}</h2>

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
          <WingsSelect value={wings} onChange={setWings} />
        </div>

        <div className={styles.modalActions}>
          <Button variant="ghost" size="md" onClick={onClose}>{t('create.cancel')}</Button>
          <Button variant="solid" size="md" onClick={handleSave} disabled={!name}>
            {t('sp.saveBtn')}
          </Button>
        </div>

      </div>
    </div>
  )
}

// ── SpecialistsTab ─────────────────────────────────────────────────────────

function SpecialistsTab({ char, onUpdate }) {
  const { t } = useLang()
  const [showAdd,    setShowAdd]    = useState(false)
  const [editingSp,  setEditingSp]  = useState(null)

  const specialists = char.equipment.specialists ?? []

  const handleAdd = (sp) => {
    onUpdate(char.id, {
      equipment: { ...char.equipment, specialists: [...specialists, sp] },
    })
  }

  const handleEdit = (updated) => {
    onUpdate(char.id, {
      equipment: {
        ...char.equipment,
        specialists: specialists.map(s => s.id === updated.id ? updated : s),
      },
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
                <div className={styles.spCardActions}>
                  <button
                    className={styles.spCardEdit}
                    onClick={() => setEditingSp(sp)}
                    title="Edit"
                  >✏</button>
                  <button
                    className={styles.spCardDelete}
                    onClick={() => handleDelete(sp.id)}
                    title="Remove"
                  >✕</button>
                </div>
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
      )}

      {showAdd && (
        <AddSPModal
          charClass={char.class}
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}

      {editingSp && (
        <EditSPModal
          charClass={char.class}
          sp={editingSp}
          onClose={() => setEditingSp(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  )
}

// ── FairyPickerModal ───────────────────────────────────────────────────────

function FairyPickerModal({ onClose, onAdd, existing }) {
  const { t } = useLang()
  const [query, setQuery] = useState('')

  const filtered = FAIRIES.filter(f =>
    f.name.toLowerCase().includes(query.toLowerCase())
  )

  const handlePick = (f) => {
    onAdd({ name: f.name, icon: f.icon, improvement: 0, rune: [] })
    onClose()
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>{t('fairy.pickTitle')}</h2>
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
          <div className={styles.hatGrid}>
            {filtered.map(f => (
              <button
                key={f.name}
                type="button"
                className={styles.hatItem}
                onClick={() => handlePick(f)}
                title={f.name}
              >
                <img src={f.icon} alt={f.name} />
              </button>
            ))}
          </div>
        )}
        <div className={styles.modalActions}>
          <Button variant="ghost" size="md" onClick={onClose}>{t('create.cancel')}</Button>
        </div>
      </div>
    </div>
  )
}

// ── FairyEditModal ─────────────────────────────────────────────────────────

const FAIRY_RUNE_RANKS = ['C', 'B', 'A', 'S']

function FairyEditModal({ fairy, onClose, onSave }) {
  const { t } = useLang()
  const [improvement, setImprovement] = useState(fairy.improvement ?? 0)
  const [rune,        setRune]        = useState(fairy.rune ?? [])
  const [selEffect,   setSelEffect]   = useState(FAIRY_RUNE_EFFECTS[0].key)
  const [selRank,     setSelRank]     = useState('C')
  const [selValue,    setSelValue]    = useState('')

  const currentTier  = improvement >= 7 ? 3 : improvement >= 4 ? 2 : improvement >= 1 ? 1 : 0
  const availEffects = FAIRY_RUNE_EFFECTS.filter(e => e.tier <= currentTier)

  const handleAdd = () => {
    if (selValue === '') return
    setRune(prev => [...prev, { key: selEffect, rank: selRank, value: Number(selValue) }])
    setSelValue('')
  }

  const handleDelete = (idx) => setRune(prev => prev.filter((_, i) => i !== idx))

  const handleSave = () => {
    onSave({ ...fairy, improvement, rune })
    onClose()
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>

        <div className={styles.fairyModalHeader}>
          <img src={fairy.icon} alt={fairy.name} className={styles.fairyModalIcon} />
          <h2 className={styles.modalTitle}>{fairy.name}</h2>
        </div>

        {/* Improvement */}
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t('fairy.improvement')}</label>
          <div className={styles.fairyImprovRow}>
            {Array.from({ length: 10 }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.fairyImprovBtn} ${improvement === i ? styles.fairyImprovBtnActive : ''}`}
                onClick={() => setImprovement(i)}
              >+{i}</button>
            ))}
          </div>
        </div>

        {/* Rune effects list */}
        <div className={styles.fairyRuneList}>
          {rune.length === 0 ? (
            <div className={styles.shellEmpty}>{t('fairy.runeEmpty')}</div>
          ) : rune.map((eff, idx) => {
            const def   = FAIRY_RUNE_EFFECTS.find(e => e.key === eff.key)
            const color = FAIRY_RUNE_RANK_COLORS[eff.rank ?? 'C']
            return (
              <div key={idx} className={styles.shellEffectRow} style={{ color }}>
                <span className={styles.shellEffectRank}>{eff.rank ?? 'C'}</span>
                <span className={styles.shellEffectLabel}>{def?.label?.replace('X', eff.value) ?? eff.key}</span>
                <span className={styles.shellEffectValue}>{eff.value}</span>
                <button className={styles.shellDeleteBtn} onClick={() => handleDelete(idx)}>✕</button>
              </div>
            )
          })}
        </div>

        {/* Add rune effect */}
        {currentTier > 0 && (
          <div className={styles.shellAddSection}>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>{t('fairy.runeEffect')}</label>
              <EffectSelect effects={availEffects} value={selEffect} onChange={setSelEffect} />
            </div>

            <div className={styles.shellAddRow}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>{t('weapon.shellRank')}</label>
                <div className={styles.rankButtons}>
                  {FAIRY_RUNE_RANKS.map(r => (
                    <button
                      key={r}
                      type="button"
                      className={styles.rankBtn}
                      style={{
                        color:           FAIRY_RUNE_RANK_COLORS[r],
                        borderColor:     selRank === r ? FAIRY_RUNE_RANK_COLORS[r] : 'transparent',
                        backgroundColor: selRank === r ? `${FAIRY_RUNE_RANK_COLORS[r]}22` : 'transparent',
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

// ── FairiesTab ─────────────────────────────────────────────────────────────

function FairiesTab({ char, onUpdate }) {
  const { t } = useLang()
  const [showPicker,  setShowPicker]  = useState(false)
  const [editingIdx,  setEditingIdx]  = useState(null)

  const fairies = Array.isArray(char.equipment.fairies) ? char.equipment.fairies : []

  const handleAdd = (fairy) => {
    onUpdate(char.id, { equipment: { ...char.equipment, fairies: [...fairies, fairy] } })
  }

  const handleDelete = (idx) => {
    onUpdate(char.id, { equipment: { ...char.equipment, fairies: fairies.filter((_, i) => i !== idx) } })
  }

  const handleSave = (updated, idx) => {
    const next = fairies.map((f, i) => i === idx ? updated : f)
    onUpdate(char.id, { equipment: { ...char.equipment, fairies: next } })
  }

  return (
    <div className={styles.spTab}>
      <div className={styles.spHeader}>
        <Button variant="primary" size="sm" onClick={() => setShowPicker(true)}>
          {t('fairy.addBtn')}
        </Button>
      </div>

      {fairies.length === 0 ? (
        <div className={styles.spEmpty}>{t('fairy.empty')}</div>
      ) : (
        <div className={styles.spGrid}>
          {fairies.map((f, idx) => {
            const tier = f.improvement >= 7 ? 3 : f.improvement >= 4 ? 2 : f.improvement >= 1 ? 1 : 0
            return (
              <div key={idx} className={styles.spCard}>
                <div className={styles.spCardTop}>
                  <img src={f.icon} alt={f.name} className={styles.spCardIcon} />
                  <span className={styles.spCardName}>{f.name}</span>
                  <button className={styles.spCardDelete} onClick={() => handleDelete(idx)}>✕</button>
                </div>

                <div className={styles.spCardBadges}>
                  <span className={`${styles.spBadge} ${styles.spBadgeImprove}`}>+{f.improvement}</span>
                </div>

                {f.rune.length > 0 && (
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

                <button
                  type="button"
                  className={styles.fairyEditRuneBtn}
                  onClick={() => setEditingIdx(idx)}
                >
                  {t('fairy.editRune')}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showPicker && (
        <FairyPickerModal
          existing={fairies}
          onClose={() => setShowPicker(false)}
          onAdd={handleAdd}
        />
      )}

      {editingIdx !== null && fairies[editingIdx] && (
        <FairyEditModal
          fairy={fairies[editingIdx]}
          onClose={() => setEditingIdx(null)}
          onSave={(updated) => { handleSave(updated, editingIdx); setEditingIdx(null) }}
        />
      )}
    </div>
  )
}

// ── TattoosTab ─────────────────────────────────────────────────────────────

const MAX_TATTOOS = 2

function TattooPickerModal({ onClose, onAdd, existing }) {
  const { t } = useLang()
  const [query, setQuery] = useState('')

  const filtered = TATTOOS.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>{t('tattoo.pickTitle')}</h2>
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
          <div className={styles.tattooGrid}>
            {filtered.map(tattoo => {
              const isEquipped = existing.some(e => e.name === tattoo.name)
              return (
                <button
                  key={tattoo.name}
                  type="button"
                  className={`${styles.tattooItem} ${isEquipped ? styles.tattooItemEquipped : ''}`}
                  disabled={isEquipped}
                  onClick={() => { onAdd({ name: tattoo.name, icon: tattoo.icon, improvement: 0 }); onClose() }}
                  title={tattoo.name}
                >
                  <img src={tattoo.icon} alt={tattoo.name} />
                  <span className={styles.tattooItemName}>{tattoo.name}</span>
                </button>
              )
            })}
          </div>
        )}
        <div className={styles.modalActions}>
          <Button variant="ghost" size="md" onClick={onClose}>{t('create.cancel')}</Button>
        </div>
      </div>
    </div>
  )
}

function TattoosTab({ char, onUpdate }) {
  const { t } = useLang()
  const [showPicker, setShowPicker] = useState(false)

  const tattoos = Array.isArray(char.equipment.tattoos) ? char.equipment.tattoos : []

  const handleAdd = (tattoo) => {
    onUpdate(char.id, { equipment: { ...char.equipment, tattoos: [...tattoos, tattoo] } })
  }

  const handleDelete = (idx) => {
    onUpdate(char.id, { equipment: { ...char.equipment, tattoos: tattoos.filter((_, i) => i !== idx) } })
  }

  const handleImprovement = (idx, value) => {
    const next = tattoos.map((t, i) => i === idx ? { ...t, improvement: value } : t)
    onUpdate(char.id, { equipment: { ...char.equipment, tattoos: next } })
  }

  return (
    <div className={styles.spTab}>
      <div className={styles.spHeader}>
        <Button
          variant="primary" size="sm"
          onClick={() => setShowPicker(true)}
          disabled={tattoos.length >= MAX_TATTOOS}
        >
          {t('tattoo.addBtn')}
        </Button>
      </div>

      {tattoos.length === 0 ? (
        <div className={styles.spEmpty}>{t('tattoo.empty')}</div>
      ) : (
        <div className={styles.tattooCards}>
          {tattoos.map((tattoo, idx) => (
            <div key={idx} className={styles.tattooCard}>
              <div className={styles.tattooCardLeft}>
                <img src={tattoo.icon} alt={tattoo.name} className={styles.tattooCardIcon} />
                <span className={styles.tattooCardName}>{tattoo.name}</span>
              </div>
              <div className={styles.tattooCardRight}>
                <div className={styles.tattooImprovRow}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`${styles.fairyImprovBtn} ${tattoo.improvement === i ? styles.fairyImprovBtnActive : ''}`}
                      onClick={() => handleImprovement(idx, i)}
                    >+{i}</button>
                  ))}
                </div>
                <button className={styles.spCardDelete} onClick={() => handleDelete(idx)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPicker && (
        <TattooPickerModal
          existing={tattoos}
          onClose={() => setShowPicker(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  )
}

// ── PartnersTab ────────────────────────────────────────────────────────────

function PartnerPickerModal({ onClose, onAdd, existing }) {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const existingNames = new Set(existing.map(p => p.name))
  const filtered = PARTNERS.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>{t('partner.pickTitle')}</h2>
        <input
          className={styles.modalInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher…"
          autoFocus
        />
        <div className={styles.nosmateGrid}>
          {filtered.map(p => {
            const already = existingNames.has(p.name)
            return (
              <button
                key={p.name}
                className={`${styles.nosmatePickItem} ${already ? styles.nosmatePickItemEquipped : ''}`}
                onClick={() => { if (!already) { onAdd(p); onClose() } }}
                disabled={already}
              >
                <img src={p.icon} alt="" className={styles.nosmatePickIcon} />
                <span className={styles.nosmatePickName}>{p.name}</span>
                <span className={styles.partnerClassBadge} style={{ background: PARTNER_CLASS_COLORS[p.class] }}>
                  {p.class}
                </span>
              </button>
            )
          })}
        </div>
        <div className={styles.modalActions}>
          <Button variant="ghost" size="md" onClick={onClose}>{t('create.cancel')}</Button>
        </div>
      </div>
    </div>
  )
}

function PartnersTab({ char, onUpdate }) {
  const { t } = useLang()
  const [showPicker, setShowPicker] = useState(false)

  const partners = char.equipment.partners ?? []

  const handleAdd = (p) => {
    onUpdate(char.id, {
      equipment: {
        ...char.equipment,
        partners: [...partners, { id: `partner-${Date.now()}`, name: p.name, icon: p.icon, class: p.class, sp: null }],
      },
    })
  }

  const handleUpdate = (id, patch) => {
    onUpdate(char.id, {
      equipment: {
        ...char.equipment,
        partners: partners.map(p => p.id === id ? { ...p, ...patch } : p),
      },
    })
  }

  const handleDelete = (id) => {
    onUpdate(char.id, {
      equipment: { ...char.equipment, partners: partners.filter(p => p.id !== id) },
    })
  }

  const handleSPChange = (partnerId, spName) => {
    const spList = PARTNER_SPECIALISTS[partners.find(p => p.id === partnerId)?.class] ?? []
    const spData = spList.find(s => s.name === spName) ?? null
    const sp = spData ? {
      name: spData.name,
      icon: spData.icon,
      skills: spData.skills.map(s => ({ name: s, rank: 'F' })),
    } : null
    handleUpdate(partnerId, { sp })
  }

  const handleSkillRank = (partnerId, skillIdx, rank) => {
    const partner = partners.find(p => p.id === partnerId)
    if (!partner?.sp) return
    const skills = partner.sp.skills.map((s, i) => i === skillIdx ? { ...s, rank } : s)
    handleUpdate(partnerId, { sp: { ...partner.sp, skills } })
  }

  return (
    <div className={styles.spTab}>
      <div className={styles.spHeader}>
        <Button variant="primary" size="sm" onClick={() => setShowPicker(true)}>
          {t('partner.addBtn')}
        </Button>
      </div>

      {partners.length === 0 ? (
        <div className={styles.spEmpty}>{t('partner.empty')}</div>
      ) : (
        <div className={styles.partnerCards}>
          {partners.map(p => {
            const spList = PARTNER_SPECIALISTS[p.class] ?? []
            return (
              <div key={p.id} className={styles.partnerCard}>
                {/* Header */}
                <div className={styles.partnerCardTop}>
                  <img src={p.icon} alt="" className={styles.partnerCardIcon} />
                  <div className={styles.partnerCardInfo}>
                    <span className={styles.partnerCardName}>{p.name}</span>
                    <span className={styles.partnerClassBadge} style={{ background: PARTNER_CLASS_COLORS[p.class] }}>
                      {p.class}
                    </span>
                  </div>
                  <button className={styles.spCardDelete} onClick={() => handleDelete(p.id)}>✕</button>
                </div>

                {/* SP card select */}
                <div className={styles.partnerSPSection}>
                  <label className={styles.nosmateLabel}>{t('partner.spLabel')}</label>
                  <div className={styles.partnerSPRow}>
                    {p.sp && <img src={p.sp.icon} alt="" className={styles.partnerSPIcon} />}
                    <select
                      className={styles.modalInput}
                      value={p.sp?.name ?? ''}
                      onChange={e => handleSPChange(p.id, e.target.value || null)}
                    >
                      <option value="">{t('partner.spNone')}</option>
                      {spList.map(sp => (
                        <option key={sp.name} value={sp.name}>{sp.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Skills + ranks */}
                  {p.sp && (
                    <div className={styles.partnerSkills}>
                      {p.sp.skills.map((skill, idx) => (
                        <div key={idx} className={styles.partnerSkillRow}>
                          <span className={styles.partnerSkillName}>{skill.name}</span>
                          <div className={styles.partnerRankBtns}>
                            {PARTNER_SP_RANKS.map(r => (
                              <button
                                key={r}
                                className={`${styles.partnerRankBtn} ${skill.rank === r ? styles.partnerRankBtnActive : ''}`}
                                style={skill.rank === r ? { background: PARTNER_SP_RANK_COLORS[r], borderColor: PARTNER_SP_RANK_COLORS[r] } : {}}
                                onClick={() => handleSkillRank(p.id, idx, r)}
                              >{r}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showPicker && (
        <PartnerPickerModal
          existing={partners}
          onClose={() => setShowPicker(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  )
}

// ── NosmatePickerModal ─────────────────────────────────────────────────────

function NosmatePickerModal({ onClose, onAdd, existing }) {
  const { t } = useLang()
  const [query, setQuery] = useState('')

  const existingNames = new Set(existing.map(n => n.name))
  const filtered = NOSMATES.filter(n =>
    n.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>{t('nosmate.pickTitle')}</h2>
        <input
          className={styles.modalInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher…"
          autoFocus
        />
        <div className={styles.nosmateGrid}>
          {filtered.map(n => {
            const already = existingNames.has(n.name)
            return (
              <button
                key={n.name}
                className={`${styles.nosmatePickItem} ${already ? styles.nosmatePickItemEquipped : ''}`}
                onClick={() => { if (!already) { onAdd(n); onClose() } }}
                disabled={already}
              >
                <img src={n.icon} alt="" className={styles.nosmatePickIcon} />
                <span className={styles.nosmatePickName}>{n.name}</span>
              </button>
            )
          })}
        </div>
        <div className={styles.modalActions}>
          <Button variant="ghost" size="md" onClick={onClose}>{t('create.cancel')}</Button>
        </div>
      </div>
    </div>
  )
}

// ── NosmatesTab ────────────────────────────────────────────────────────────

const NOSMATE_STARS = [1, 2, 3, 4, 5, 6]

function NosmatesTab({ char, onUpdate }) {
  const { t } = useLang()
  const [showPicker, setShowPicker] = useState(false)

  const nosmates = char.equipment.nosmates ?? []

  const handleAdd = (pet) => {
    onUpdate(char.id, {
      equipment: {
        ...char.equipment,
        nosmates: [...nosmates, { id: `nosmate-${Date.now()}`, name: pet.name, icon: pet.icon, level: 1, heroLevel: 0, stars: 1 }],
      },
    })
  }

  const handleUpdate = (id, patch) => {
    onUpdate(char.id, {
      equipment: {
        ...char.equipment,
        nosmates: nosmates.map(n => n.id === id ? { ...n, ...patch } : n),
      },
    })
  }

  const handleDelete = (id) => {
    onUpdate(char.id, {
      equipment: { ...char.equipment, nosmates: nosmates.filter(n => n.id !== id) },
    })
  }

  return (
    <div className={styles.spTab}>
      <div className={styles.spHeader}>
        <Button variant="primary" size="sm" onClick={() => setShowPicker(true)}>
          {t('nosmate.addBtn')}
        </Button>
      </div>

      {nosmates.length === 0 ? (
        <div className={styles.spEmpty}>{t('nosmate.empty')}</div>
      ) : (
        <div className={styles.nosmateCards}>
          {nosmates.map(n => (
            <div key={n.id} className={styles.nosmateCard}>
              <div className={styles.nosmateCardTop}>
                <img src={n.icon} alt="" className={styles.nosmateCardIcon} />
                <span className={styles.nosmateCardName}>{n.name}</span>
                <button className={styles.spCardDelete} onClick={() => handleDelete(n.id)} title="Remove">✕</button>
              </div>

              {/* Stars */}
              <div className={styles.nosmateStarRow}>
                <span className={styles.nosmateLabel}>{t('nosmate.training')}</span>
                <div className={styles.nosmateStars}>
                  {NOSMATE_STARS.map(s => (
                    <button
                      key={s}
                      className={`${styles.nosmateStar} ${s <= n.stars ? styles.nosmateStarFilled : ''}`}
                      onClick={() => handleUpdate(n.id, { stars: s })}
                    >★</button>
                  ))}
                </div>
              </div>

              {/* Level + Hero Level */}
              <div className={styles.nosmateInputRow}>
                <div className={styles.nosmateInputGroup}>
                  <label className={styles.nosmateLabel}>{t('nosmate.level')}</label>
                  <input
                    className={styles.nosmateInput}
                    type="number"
                    value={n.level}
                    min={1} max={99}
                    onChange={e => handleUpdate(n.id, { level: Math.max(1, Math.min(99, parseInt(e.target.value) || 1)) })}
                  />
                </div>
                <div className={styles.nosmateInputGroup}>
                  <label className={styles.nosmateLabel}>{t('nosmate.heroLevel')}</label>
                  <input
                    className={styles.nosmateInput}
                    type="number"
                    value={n.heroLevel}
                    min={0} max={60}
                    onChange={e => handleUpdate(n.id, { heroLevel: Math.max(0, Math.min(60, parseInt(e.target.value) || 0)) })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPicker && (
        <NosmatePickerModal
          existing={nosmates}
          onClose={() => setShowPicker(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  )
}

// ── BooksTab ───────────────────────────────────────────────────────────────

function BooksTab({ char, onUpdate }) {
  const owned = new Set(char.equipment.books ?? [])

  const toggle = (bookName) => {
    const next = owned.has(bookName)
      ? [...owned].filter(n => n !== bookName)
      : [...owned, bookName]
    onUpdate(char.id, { equipment: { ...char.equipment, books: next } })
  }

  return (
    <div className={styles.booksGrid}>
      {TRAINING_BOOKS.map(book => (
        <button
          key={book.name}
          className={`${styles.bookItem} ${owned.has(book.name) ? styles.bookItemOwned : styles.bookItemLocked}`}
          onClick={() => toggle(book.name)}
          title={book.name}
        >
          <img src={book.icon} alt="" className={styles.bookIcon} />
          <span className={styles.bookName}>{book.name}</span>
        </button>
      ))}
    </div>
  )
}

// ── EditCharModal ───────────────────────────────────────────────────────────

function EditCharModal({ char, onClose, onSave }) {
  const { t } = useLang()
  const [name,      setName]      = useState(char.name)
  const [level,     setLevel]     = useState(String(char.level))
  const [heroLevel, setHeroLevel] = useState(String(char.heroLevel))
  const [error,     setError]     = useState('')

  const handleSave = () => {
    if (!name.trim())                    { setError(t('create.errName'));    return }
    if (name.trim().length < 3)          { setError(t('create.errNameLen')); return }
    const lvl = parseInt(level)
    if (!lvl || lvl < 1 || lvl > 99)    { setError(t('create.errLevel'));   return }
    onSave({
      name:      name.trim(),
      level:     lvl,
      heroLevel: Math.max(0, parseInt(heroLevel) || 0),
    })
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>

        <h2 className={styles.modalTitle}>{t('profile.editCharTitle')}</h2>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t('create.nameLabel')}</label>
          <input
            className={styles.modalInput}
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder={t('create.namePlaceholder')}
            autoFocus
            maxLength={20}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          />
        </div>

        <div className={styles.modalRow}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>{t('create.levelLabel')}</label>
            <input
              className={styles.modalInput}
              type="number"
              value={level}
              min={1} max={99}
              onChange={e => { setLevel(e.target.value); setError('') }}
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
          <Button variant="solid" size="md" onClick={handleSave}>{t('profile.editCharSave')}</Button>
        </div>

      </div>
    </div>
  )
}

// ── ProfilePage ────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { isAuthenticated, user } = useAuth()
  const { t } = useLang()
  const { characters, addCharacter, updateCharacter, loading } = useCharacters()

  const [selectedIdx,    setSelectedIdx]    = useState(0)
  const [showCreate,     setShowCreate]     = useState(false)
  const [showEditChar, setShowEditChar] = useState(false)
  const [activeTab,      setActiveTab]      = useState('equipment')
  const [profileServer,  setProfileServer]  = useState(null)
  const [serverEditing,  setServerEditing]  = useState(false)
  const [serverSaving,   setServerSaving]   = useState(false)
  const [serverDraft,    setServerDraft]    = useState(null)

  // Load profile.server on mount
  useEffect(() => {
    if (!user || !hasSupabase) return
    supabase
      .from('profiles')
      .select('server')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.server) {
          setProfileServer(data.server)
        } else {
          setServerEditing(true) // Show selector immediately if not set
        }
      })
  }, [user?.id])

  const saveServer = async () => {
    if (!serverDraft || !user || !hasSupabase) return
    setServerSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ server: serverDraft })
      .eq('id', user.id)
    if (!error) {
      // Backfill existing characters that have no server yet
      await supabase
        .from('characters')
        .update({ server: serverDraft })
        .eq('profile_id', user.id)
        .is('server', null)
    }
    setServerSaving(false)
    if (!error) {
      setProfileServer(serverDraft)
      setServerEditing(false)
    }
  }

  const data = characters[selectedIdx] ?? null
  const cls  = data ? (CLASSES[data.class] ?? CLASSES.Archer) : null

  const TABS = [
    { key: 'equipment',   label: t('tabs.equipment')   },
    { key: 'specialists', label: t('tabs.specialists')  },
    { key: 'fairies',   label: t('tabs.fairies')   },
    { key: 'tattoos',   label: t('tabs.tattoos')   },
    { key: 'nosmates',  label: t('tabs.nosmates')  },
    { key: 'partners',  label: t('tabs.partners')  },
    { key: 'books',     label: t('tabs.books')     },
  ]

  const handleCreate = async (char) => {
    const newIdx = characters.length
    const result = await addCharacter(char)
    if (!result?.error) setSelectedIdx(newIdx)
    return result
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <h2 className={styles.selectorTitle} style={{ margin: 0 }}>{t('profile.myCharacters')}</h2>

          {/* Server selector */}
          {!serverEditing && profileServer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em',
                color: SERVER_COLORS[profileServer],
                border: `1px solid ${SERVER_COLORS[profileServer]}55`,
                borderRadius: '999px', padding: '0.2rem 0.7rem',
              }}>
                ● {t(`raids.server.${profileServer}`)}
              </span>
              <button
                style={{ fontSize: '0.72rem', color: 'var(--text-faint)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => { setServerDraft(profileServer); setServerEditing(true) }}
              >
                {t('profile.serverChange')}
              </button>
            </div>
          ) : serverEditing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {t('profile.serverLabel')} :
              </span>
              {['undercity', 'dragonveil'].map(s => (
                <label
                  key={s}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.35rem 0.8rem',
                    border: `1px solid ${serverDraft === s ? SERVER_COLORS[s] : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.83rem', cursor: 'pointer',
                    color: serverDraft === s ? 'var(--text)' : 'var(--text-dim)',
                    background: serverDraft === s ? 'rgba(255,255,255,0.05)' : 'transparent',
                    transition: 'border-color 0.15s',
                    userSelect: 'none',
                  }}
                >
                  <input type="radio" name="profileServer" value={s} checked={serverDraft === s} onChange={() => setServerDraft(s)} hidden />
                  <span style={{ color: SERVER_COLORS[s], fontSize: '0.6rem' }}>●</span>
                  {t(`raids.server.${s}`)}
                </label>
              ))}
              <button
                style={{
                  fontSize: '0.8rem', fontWeight: 600,
                  padding: '0.35rem 0.85rem',
                  background: serverDraft ? 'var(--gold-faint)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${serverDraft ? 'var(--gold-dim)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  color: serverDraft ? 'var(--gold-light)' : 'var(--text-faint)',
                  cursor: serverDraft ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                  fontFamily: "'Exo 2', sans-serif",
                }}
                disabled={!serverDraft || serverSaving}
                onClick={saveServer}
              >
                {serverSaving ? '…' : t('profile.serverSave')}
              </button>
            </div>
          )}
        </div>

        {/* Warning if server not set */}
        {!profileServer && !serverEditing && (
          <div style={{ fontSize: '0.82rem', color: 'var(--gold-dim)', marginBottom: '0.75rem', opacity: 0.85 }}>
            ⚠️ {t('profile.serverRequired')}
          </div>
        )}
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
                  onClick={() => profileServer ? setShowCreate(true) : setServerEditing(true)}
                  title={!profileServer ? t('profile.serverRequired') : undefined}
                  style={!profileServer ? { opacity: 0.5 } : undefined}
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
              <Button variant="primary" size="md" onClick={() => setShowEditChar(true)}>{t('profile.edit')}</Button>
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
            {activeTab === 'fairies'  && <FairiesTab  char={data} onUpdate={updateCharacter} />}
            {activeTab === 'tattoos'  && <TattoosTab   char={data} onUpdate={updateCharacter} />}
            {activeTab === 'nosmates' && <NosmatesTab  char={data} onUpdate={updateCharacter} />}
            {activeTab === 'partners' && <PartnersTab  char={data} onUpdate={updateCharacter} />}
            {activeTab === 'books'    && <BooksTab     char={data} onUpdate={updateCharacter} />}
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

      {showCreate && profileServer && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          server={profileServer}
        />
      )}

      {showEditChar && data && (
        <EditCharModal
          char={data}
          onClose={() => setShowEditChar(false)}
          onSave={(fields) => { updateCharacter(data.id, fields); setShowEditChar(false) }}
        />
      )}

    </div>
  )
}
