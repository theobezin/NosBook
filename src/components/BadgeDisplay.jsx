import { useState } from 'react'
import { useLang } from '@/i18n'
import { RAIDS } from '@/lib/raids'
import styles from './BadgeDisplay.module.css'

// ── Définitions des badges manuels ─────────────────────────────────────────
export const BADGE_DEFS = {
  founder:     { icon: '👑', color: '#f39c12', key: 'badges.founder'     },
  beta_tester: { icon: '🧪', color: '#9b59b6', key: 'badges.betaTester'  },
  contributor: { icon: '🛠️', color: '#3498db', key: 'badges.contributor' },
}

// ── Icône de raid (même pattern que PlannerPage) ───────────────────────────
function RaidIcon({ iconId, size = 20 }) {
  const [err, setErr] = useState(false)
  if (err) return <span style={{ width: size, height: size, display: 'inline-block' }} />
  return (
    <img
      src={`https://nosapki.com/images/icons/${iconId}.png`}
      alt=""
      style={{ width: size, height: size, imageRendering: 'pixelated', objectFit: 'contain', verticalAlign: 'middle' }}
      onError={() => setErr(true)}
    />
  )
}

// ── Tooltip simple ─────────────────────────────────────────────────────────
function Tooltip({ label, color, children }) {
  const [show, setShow] = useState(false)
  return (
    <span
      className={styles.tooltipWrap}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className={styles.tooltip} style={{ borderColor: color + '55' }}>
          {label}
        </span>
      )}
    </span>
  )
}

/**
 * Affiche les badges d'un profil.
 * @param {string[]} badges       — badges manuels ex: ['founder','beta_tester']
 * @param {boolean}  isModerator  — rôle modérateur
 * @param {string[]} top1Raids    — slugs des raids dont ce profil est top1
 * @param {string}   size         — 'sm' | 'md' (default 'md')
 */
export default function BadgeDisplay({ badges = [], isModerator = false, top1Raids = [], size = 'md' }) {
  const { t, lang } = useLang()

  const hasAny = badges.length > 0 || isModerator || top1Raids.length > 0
  if (!hasAny) return null

  const iconSize = size === 'sm' ? 16 : 20

  return (
    <div className={`${styles.wrap} ${size === 'sm' ? styles.sm : ''}`}>

      {/* Modérateur */}
      {isModerator && (
        <Tooltip label={t('badges.moderator')} color="#2ecc71">
          <span className={styles.badge} style={{ background: '#2ecc7115', borderColor: '#2ecc7155', color: '#2ecc71' }}>
            🛡️ {size !== 'sm' && t('badges.moderator')}
          </span>
        </Tooltip>
      )}

      {/* Badges manuels */}
      {badges.map(id => {
        const def = BADGE_DEFS[id]
        if (!def) return null
        return (
          <Tooltip key={id} label={t(def.key)} color={def.color}>
            <span className={styles.badge} style={{ background: def.color + '15', borderColor: def.color + '55', color: def.color }}>
              {def.icon} {size !== 'sm' && t(def.key)}
            </span>
          </Tooltip>
        )
      })}

      {/* Top1 PVE — icône du raid + "Destructeur de X" */}
      {top1Raids.map(slug => {
        const raid = RAIDS.find(r => r.slug === slug)
        if (!raid) return null
        const raidName = raid[lang] ?? raid.fr
        const label = t('badges.destroyer').replace('{raid}', raidName)
        return (
          <Tooltip key={slug} label={label} color={raid.color}>
            <span
              className={styles.badge}
              style={{ background: raid.color + '15', borderColor: raid.color + '55', color: raid.color, gap: 4 }}
            >
              <RaidIcon iconId={raid.icon} size={iconSize} />
              {size !== 'sm' && <span style={{ fontSize: '0.75em' }}>{label}</span>}
            </span>
          </Tooltip>
        )
      })}

    </div>
  )
}
