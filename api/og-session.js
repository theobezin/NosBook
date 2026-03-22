const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY
const APP_URL      = 'https://nos-book.vercel.app'
const FN_BASE      = 'https://gdwdayxfblmfbjtxybtv.supabase.co/functions/v1/og-session'

const RAIDS_MAP = {
  'mother-cuby':           { name: 'M\u00e8re Cuby',                 color: '#2ecc71' },
  'ginseng':               { name: 'Ginseng',                        color: '#2ecc71' },
  'dark-castra':           { name: 'Castra obscur',                  color: '#2ecc71' },
  'giant-black-spider':    { name: 'Araign\u00e9e noire g\u00e9ante',color: '#2ecc71' },
  'massive-slade':         { name: 'Slade g\u00e9ant',               color: '#2ecc71' },
  'chicken-king':          { name: 'Roi poulet',                     color: '#2ecc71' },
  'namaju':                { name: 'Namaju',                         color: '#2ecc71' },
  'ibrahim':               { name: 'Ibrahim',                        color: '#e74c3c' },
  'kertos':                { name: 'Kertos',                         color: '#e74c3c' },
  'valakus':               { name: 'Valakus',                        color: '#e74c3c' },
  'grenigas':              { name: 'Grenigas',                       color: '#e74c3c' },
  'lord-draco':            { name: 'Sire Draco',                     color: '#e74c3c' },
  'glacerus':              { name: 'Glacerus',                       color: '#e74c3c' },
  'twisted-yertirand':     { name: 'Yertirand corrompu',             color: '#e74c3c' },
  'zenas':                 { name: 'Z\u00e9nas',                     color: '#9b59b6' },
  'erenia':                { name: 'Erenia',                         color: '#9b59b6' },
  'incomplete-fernon':     { name: 'Fernon incompl\u00e8te',         color: '#9b59b6' },
  'greedy-fafnir':         { name: 'Terrible Fafnir',                color: '#9b59b6' },
  'spirit-king-kirollas':  { name: 'Kirollas roi des esprits',       color: '#c9a96e' },
  'beast-king-carno':      { name: 'Carno roi des b\u00eates',       color: '#c9a96e' },
  'demon-god-belial':      { name: 'Dieu-d\u00e9mon B\u00e9lial',    color: '#c9a96e' },
  'evil-overlord-paimon':  { name: 'Paimon seigneur mal\u00e9fique', color: '#c9a96e' },
  'revenant-paimon':       { name: 'Paimon ressuscit\u00e9',         color: '#c9a96e' },
  'zombie-dragon-valehir': { name: 'Dragon zombie Valehir',          color: '#1abc9c' },
  'ice-dragon-alzanor':    { name: 'Alzanor dragon givr\u00e9',      color: '#1abc9c' },
  'weak-asgobas':          { name: 'Asgobas faible',                 color: '#1abc9c' },
  'moss-giant-pollutus':   { name: 'G\u00e9ant moussu Pollutus',     color: '#3498db' },
  'giant-arma':            { name: 'Arma g\u00e9ant',                color: '#3498db' },
  'ultimate-giant-arma':   { name: 'Arma g\u00e9ant absolu',         color: '#3498db' },
  'nezarun':               { name: 'N\u00e9zarun',                   color: '#e67e22' },
  'crusher-nezarun':       { name: 'N\u00e9zarun d\u00e9vastateur',  color: '#e67e22' },
  'giant-grasslin':        { name: 'Herbin g\u00e9ant',              color: '#8e44ad' },
  'captain-pete-openg':    { name: "Capitaine Pete O'Peng",          color: '#8e44ad' },
  'snowman-head':          { name: 'T\u00eate bonhomme de neige',    color: '#8e44ad' },
  'jack-o-lantern':        { name: "Jack O'Lantern",                 color: '#8e44ad' },
  'chicken-queen':         { name: 'Reine poule',                    color: '#8e44ad' },
  'foxy':                  { name: 'Foxy',                           color: '#8e44ad' },
  'maru':                  { name: 'Maru',                           color: '#8e44ad' },
  'witch-laurena':         { name: 'Sorci\u00e8re Laurena',          color: '#8e44ad' },
  'imp-cheongbi':          { name: 'Diablotin Cheongbi',             color: '#8e44ad' },
  'lola-lopears':          { name: 'Lola Longues-Oreilles',          color: '#8e44ad' },
  'mad-professor-macavity':{ name: 'Professeur fou Macavity',        color: '#8e44ad' },
  'mad-march-hare':        { name: 'Li\u00e8vre de Mars fou',        color: '#8e44ad' },
  'lord-melonoth':         { name: 'Seigneur Melonoth',              color: '#8e44ad' },
}

function getRaid(slug) {
  if (RAIDS_MAP[slug]) return { ...RAIDS_MAP[slug], hc: false }
  const base = slug.replace(/-hc$/, '')
  if (RAIDS_MAP[base]) return { ...RAIDS_MAP[base], color: '#ff4757', hc: true }
  return { name: slug, color: '#c9a96e', hc: false }
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[^\x00-\x7F]/g, c => `&#${c.charCodeAt(0)};`)
}

function formatDate(date, time, duration) {
  const d = new Date(date + 'T00:00:00')
  const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  if (!time) return dateStr
  const timeStr = time.slice(0, 5)
  if (!duration) return `${dateStr}  ${timeStr}`
  const [h, m] = time.split(':').map(Number)
  const endMin = h * 60 + m + duration
  const endH   = Math.floor(endMin / 60) % 24
  const endM   = endMin % 60
  return `${dateStr}  ${timeStr} -> ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

export default async function handler(req, res) {
  const { id } = req.query
  if (!id) return res.status(400).send('Missing id')

  const hdrs = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }

  const [sessionRes, regRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/raid_sessions?id=eq.${encodeURIComponent(id)}&select=*`, { headers: hdrs }),
    fetch(`${SUPABASE_URL}/rest/v1/raid_session_registrations?session_id=eq.${encodeURIComponent(id)}&select=*`, {
      headers: { ...hdrs, Prefer: 'count=exact' },
    }),
  ])

  const sessions = await sessionRes.json()
  const session  = sessions?.[0]
  if (!session) return res.status(404).send('Session not found')

  const cr       = regRes.headers.get('content-range')
  const regCount = cr ? parseInt(cr.split('/')[1] ?? '0', 10) : 0

  const raid        = getRaid(session.raid_slug)
  const storagePng  = `${SUPABASE_URL}/storage/v1/object/public/og-images/${id}.png`
  const sessionUrl  = `${APP_URL}/raids/${id}`
  const serverLabel = session.server === 'undercity' ? 'Undercity' : 'Dragonveil'
  const dateStr     = formatDate(session.date, session.time, session.duration_minutes)
  const title       = `${raid.name}${raid.hc ? ' (HC)' : ''} \u00b7 ${serverLabel}`
  const desc        = [
    dateStr,
    session.leader_username ? `Chef : ${session.leader_username}` : null,
    (session.min_level ?? 0) > 0 ? `HN ${session.min_level}+` : null,
    `${regCount}/${session.max_players} inscrits`,
  ].filter(Boolean).join(' \u00b7 ')

  // Use Storage image if pre-generated, fallback to dynamic Supabase function
  let imageUrl = `${FN_BASE}?id=${encodeURIComponent(id)}&img=1`
  try {
    const head = await fetch(storagePng, { method: 'HEAD' })
    if (head.ok) imageUrl = storagePng
  } catch (_) {}

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <meta property="og:type"         content="website" />
  <meta property="og:site_name"    content="NosBook" />
  <meta property="og:title"        content="${esc(title)}" />
  <meta property="og:description"  content="${esc(desc)}" />
  <meta property="og:image"        content="${esc(imageUrl)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image"       content="${esc(imageUrl)}" />
  <meta name="theme-color"         content="${raid.color}" />
  <meta http-equiv="refresh"       content="0;url=${esc(sessionUrl)}" />
</head>
<body>
  <p>Redirection vers <a href="${esc(sessionUrl)}">${esc(title)}</a>...</p>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  res.send(html)
}
