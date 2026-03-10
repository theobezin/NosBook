// Utilitaires partagés entre les pages

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const SERVER_COLORS = {
  undercity:  '#7c6ce0',
  dragonveil: '#e06c5a',
}
