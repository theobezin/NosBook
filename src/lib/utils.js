// Utilitaires partagés entre les pages

/**
 * Formate un nombre (ou une chaîne) en séparant les milliers par des espaces.
 * Utilisé sur les inputs de saisie de montants (or, quantités).
 * Exemple : "1500000" → "1 500 000"
 * L'onChange correspondant doit appeler fmtThousands(e.target.value) directement,
 * car la fonction strip les non-chiffres avant de reformater.
 */
export function fmtThousands(val) {
  const digits = String(val ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') // espace insécable
}

const SUFFIX_MULT = { k: 1_000, m: 1_000_000, g: 1_000_000_000, b: 1_000_000_000 }

/**
 * Parse une chaîne avec suffixe K/M/G/B (insensible à la casse) en nombre.
 * Exemples : "3G" → 3000000000, "300M" → 300000000, "500K" → 500000, "1.5G" → 1500000000
 * Gère aussi les nombres bruts avec espaces : "30 000 000" → 30000000
 */
export function parseShorthand(val) {
  const str = String(val ?? '').trim().replace(/[\s\u00a0]/g, '')
  if (!str) return NaN
  const match = str.match(/^(\d+[.,]?\d*)([kKmMgGbB]?)$/)
  if (!match) return NaN
  const num = parseFloat(match[1].replace(',', '.'))
  if (isNaN(num)) return NaN
  const mult = SUFFIX_MULT[match[2].toLowerCase()] ?? 1
  return Math.round(num * mult)
}

/**
 * Formate la saisie en préservant le suffixe K/M/G/B si présent,
 * sinon formate avec des espaces entre milliers.
 * Exemple : "3g" → "3G", "30000000" → "30 000 000", "1.5m" → "1.5M"
 */
export function fmtShorthand(val) {
  const str = String(val ?? '').replace(/[\s\u00a0]/g, '')
  if (!str) return ''
  const match = str.match(/^(\d*[.,]?\d*)([kKmMgGbB]?)$/)
  if (!match) return fmtThousands(val)
  const numPart = match[1]
  const suffix  = match[2].toUpperCase()
  if (suffix) return numPart + suffix
  return fmtThousands(numPart)
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const SERVER_COLORS = {
  undercity:  '#7c6ce0',
  dragonveil: '#e06c5a',
}
