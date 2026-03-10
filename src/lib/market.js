// ============================================================
// NosBook — Market constants & helpers
// Single source of truth for tags, statuses, and gold formatting.
// ============================================================

// ── Tag definitions ────────────────────────────────────────
// slug   : stored in market_listings.tags[]
// icon   : displayed in UI
// label  : translated via t(`market.tags.${slug}`)
export const MARKET_TAGS = [
  { slug: 'swordsman',          icon: '⚔️'  },
  { slug: 'archer',             icon: '🏹'  },
  { slug: 'mage',               icon: '🔮'  },
  { slug: 'martial_artist',     icon: '🥊'  },
  { slug: 'equipment_acts_1_5', icon: '🎒'  },
  { slug: 'equipment_act_6',    icon: '🗡️'  },
  { slug: 'equipment_act_7',    icon: '🗡️'  },
  { slug: 'equipment_act_8',    icon: '⚒️'  },
  { slug: 'equipment_act_9',    icon: '🔱'  },
  { slug: 'equipment_act_10',   icon: '💠'  },
  { slug: 'specialist_card',    icon: '🃏'  },
  { slug: 'wings',              icon: '🪽'  },
  { slug: 'fairy',              icon: '🧚'  },
  { slug: 'pet',                icon: '🐾'  },
  { slug: 'partner',            icon: '🤝'  },
  { slug: 'partner_sp',         icon: '✨'  },
  { slug: 'costumes_skins',     icon: '👘'  },
  { slug: 'nosmall',            icon: '🏪'  },
  { slug: 'miscellaneous',      icon: '🔧'  },
]

// Tag slugs set for quick lookup
export const MARKET_TAG_SLUGS = new Set(MARKET_TAGS.map(t => t.slug))

// ── Listing types ──────────────────────────────────────────
export const LISTING_TYPES = {
  SELL: 'sell',
  BUY:  'buy',
}

// ── Listing statuses ───────────────────────────────────────
export const LISTING_STATUS = {
  ACTIVE:   'active',
  SOLD:     'sold',
  ARCHIVED: 'archived',
}

// ── Offer statuses ─────────────────────────────────────────
export const OFFER_STATUS = {
  ACTIVE:    'active',
  CANCELLED: 'cancelled',
  ACCEPTED:  'accepted',
  BLOCKED:   'blocked',
}

// ── Report statuses ────────────────────────────────────────
export const REPORT_STATUS = {
  PENDING:   'pending',
  VALIDATED: 'validated',
  REJECTED:  'rejected',
}

// ── Servers (mirrors profiles.server constraint) ───────────
export const SERVERS = ['undercity', 'dragonveil']

// ── Gold helpers ───────────────────────────────────────────

/**
 * Format a gold amount for display.
 * Supports values up to 30 000 000 000 (30B).
 * Examples: 1500 → "1 500", 1000000 → "1 000 000"
 */
export function formatGold(amount) {
  if (amount == null) return '—'
  return Number(amount).toLocaleString('fr-FR')
}

/**
 * Parse a user-typed gold string to a safe integer.
 * Strips spaces, commas, dots used as thousands separators.
 * Returns null if invalid or exceeds MAX_GOLD.
 */
export const MAX_GOLD = 30_000_000_000

export function parseGold(str) {
  if (!str && str !== 0) return null
  const cleaned = String(str).replace(/[\s,.]/g, '')
  const n = parseInt(cleaned, 10)
  if (isNaN(n) || n < 0 || n > MAX_GOLD) return null
  return n
}

// ── Inactivity check ──────────────────────────────────────

/**
 * Returns true if a listing should be auto-archived
 * (no activity for 30 days).
 */
export function isExpired(lastActivityAt) {
  if (!lastActivityAt) return false
  const ms30days = 30 * 24 * 60 * 60 * 1000
  return Date.now() - new Date(lastActivityAt).getTime() > ms30days
}

// ── Best offer helper ─────────────────────────────────────

/**
 * Returns the active offer with the highest price from a list.
 */
export function bestOffer(offers = []) {
  return offers
    .filter(o => o.status === OFFER_STATUS.ACTIVE)
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))[0] ?? null
}
