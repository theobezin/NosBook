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

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const SERVER_COLORS = {
  undercity:  '#7c6ce0',
  dragonveil: '#e06c5a',
}
