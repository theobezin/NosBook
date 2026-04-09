import satori from 'npm:satori@0.10.13'
import { Resvg, initWasm } from 'npm:@resvg/resvg-wasm@2.6.2'
import { createClient } from 'npm:@supabase/supabase-js@2'

let wasmReady = false
async function ensureWasm() {
  if (wasmReady) return
  await initWasm(fetch('https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm'))
  wasmReady = true
}

const APP_URL = 'https://nosbook.app'
const FN_BASE = 'https://gdwdayxfblmfbjtxybtv.supabase.co/functions/v1/og-session'

// ── Lookup raids ──────────────────────────────────────────────────────────────

const RAIDS_MAP: Record<string, { name: string; color: string; icon: string }> = {
  // Act 1
  'mother-cuby':           { name: 'Mère Cuby',                 color: '#2ecc71', icon: '1127' },
  'ginseng':               { name: 'Ginseng',                   color: '#2ecc71', icon: '1128' },
  'dark-castra':           { name: 'Castra obscur',             color: '#2ecc71', icon: '1129' },
  'giant-black-spider':    { name: 'Araignée noire géante',     color: '#2ecc71', icon: '1130' },
  'massive-slade':         { name: 'Slade géant',               color: '#2ecc71', icon: '1131' },
  'chicken-king':          { name: 'Roi poulet',                color: '#2ecc71', icon: '1195' },
  'namaju':                { name: 'Namaju',                    color: '#2ecc71', icon: '1226' },
  // Act 5
  'ibrahim':               { name: 'Ibrahim',                   color: '#e74c3c', icon: '1892' },
  'kertos':                { name: 'Kertos',                    color: '#e74c3c', icon: '2460' },
  'valakus':               { name: 'Valakus',                   color: '#e74c3c', icon: '2461' },
  'grenigas':              { name: 'Grenigas',                  color: '#e74c3c', icon: '2462' },
  'lord-draco':            { name: 'Sire Draco',                color: '#e74c3c', icon: '2547' },
  'glacerus':              { name: 'Glacerus',                  color: '#e74c3c', icon: '2583' },
  'twisted-yertirand':     { name: 'Yertirand corrompu',        color: '#e74c3c', icon: '2942' },
  // Act 6
  'zenas':                 { name: 'Zénas',                     color: '#9b59b6', icon: '2750' },
  'erenia':                { name: 'Erenia',                    color: '#9b59b6', icon: '2751' },
  'incomplete-fernon':     { name: 'Fernon incomplète',         color: '#9b59b6', icon: '2868' },
  'greedy-fafnir':         { name: 'Terrible Fafnir',           color: '#9b59b6', icon: '2905' },
  // Act 7
  'spirit-king-kirollas':  { name: 'Kirollas roi des esprits',  color: '#c9a96e', icon: '4271' },
  'beast-king-carno':      { name: 'Carno roi des bêtes',       color: '#c9a96e', icon: '4272' },
  'demon-god-belial':      { name: 'Dieu-démon Bélial',         color: '#c9a96e', icon: '4273' },
  'evil-overlord-paimon':  { name: 'Paimon seigneur maléfique', color: '#c9a96e', icon: '4304' },
  'revenant-paimon':       { name: 'Paimon ressuscité',         color: '#c9a96e', icon: '4500' },
  // Act 8
  'zombie-dragon-valehir': { name: 'Dragon zombie Valehir',     color: '#1abc9c', icon: '4612' },
  'ice-dragon-alzanor':    { name: 'Alzanor dragon givré',      color: '#1abc9c', icon: '4615' },
  'weak-asgobas':          { name: 'Asgobas faible',            color: '#1abc9c', icon: '4868' },
  // Act 9
  'moss-giant-pollutus':   { name: 'Géant moussu Pollutus',     color: '#3498db', icon: '7094' },
  'giant-arma':            { name: 'Arma géant',                color: '#3498db', icon: '7095' },
  'ultimate-giant-arma':   { name: 'Arma géant absolu',         color: '#3498db', icon: '7135' },
  // Act 10
  'nezarun':               { name: 'Nézarun',                   color: '#e67e22', icon: '7590' },
  'crusher-nezarun':       { name: 'Nézarun dévastateur',       color: '#e67e22', icon: '7591' },
  // Event
  'giant-grasslin':        { name: 'Herbin géant',              color: '#8e44ad', icon: '1234' },
  'captain-pete-openg':    { name: "Capitaine Pete O'Peng",     color: '#8e44ad', icon: '1440' },
  'snowman-head':          { name: 'Tête bonhomme de neige',    color: '#8e44ad', icon: '1371' },
  'jack-o-lantern':        { name: "Jack O'Lantern",            color: '#8e44ad', icon: '1915' },
  'chicken-queen':         { name: 'Reine poule',               color: '#8e44ad', icon: '4087' },
  'foxy':                  { name: 'Foxy',                      color: '#8e44ad', icon: '2662' },
  'maru':                  { name: 'Maru',                      color: '#8e44ad', icon: '2674' },
  'witch-laurena':         { name: 'Sorcière Laurena',          color: '#8e44ad', icon: '2698' },
  'imp-cheongbi':          { name: 'Diablotin Cheongbi',        color: '#8e44ad', icon: '2690' },
  'lola-lopears':          { name: 'Lola Longues-Oreilles',     color: '#8e44ad', icon: '2716' },
  'mad-professor-macavity':{ name: 'Professeur fou Macavity',   color: '#8e44ad', icon: '2964' },
  'mad-march-hare':        { name: 'Lièvre de Mars fou',        color: '#8e44ad', icon: '4121' },
  'lord-melonoth':         { name: 'Seigneur Melonoth',         color: '#8e44ad', icon: '7393' },
}

function getRaid(slug: string): { name: string; color: string; icon: string; hc: boolean } {
  if (RAIDS_MAP[slug]) return { ...RAIDS_MAP[slug], hc: false }
  // HC variants: strip -hc suffix, use base raid data with red color
  const base = slug.replace(/-hc$/, '')
  if (RAIDS_MAP[base]) return { ...RAIDS_MAP[base], color: '#ff4757', hc: true }
  return { name: slug, color: '#c9a96e', icon: '1127', hc: false }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[^\x00-\x7F]/g, c => `&#${c.charCodeAt(0)};`)
}

function formatDate(date: string, time: string | null, duration: number | null): string {
  const d = new Date(date + 'T00:00:00')
  const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  if (!time) return dateStr
  const timeStr = time.slice(0, 5)
  if (!duration) return `${dateStr}  ${timeStr}`
  const [h, m] = time.split(':').map(Number)
  const endMin = h * 60 + m + duration
  const endH   = Math.floor(endMin / 60) % 24
  const endM   = endMin % 60
  const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  return `${dateStr}  ${timeStr} -> ${endStr}`
}

// ── Element factory (Satori-compatible) ───────────────────────────────────────

type Child = SatoriEl | string | null | false | undefined
interface SatoriEl {
  type: string
  props: Record<string, unknown>
}

function el(type: string, props: Record<string, unknown>, ...children: Child[]): SatoriEl {
  const flat = children.flat().filter(c => c !== null && c !== false && c !== undefined)
  return {
    type,
    props: {
      ...props,
      children: flat.length === 0 ? undefined : flat.length === 1 ? flat[0] : flat,
    },
  }
}

// ── Image generation ──────────────────────────────────────────────────────────

let fontRegular: ArrayBuffer | null = null
let fontBold: ArrayBuffer | null    = null

async function loadFonts() {
  if (fontRegular && fontBold) return
  const [r, b] = await Promise.all([
    fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-400-normal.woff').then(r => r.arrayBuffer()),
    fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-700-normal.woff').then(r => r.arrayBuffer()),
  ])
  fontRegular = r
  fontBold    = b
}

async function generateImage(
  session:  Record<string, unknown>,
  raid:     { name: string; color: string; icon: string; hc: boolean },
  regCount: number,
  players:  { name: string; sp: string | null; team: string }[],
): Promise<Uint8Array> {
  await Promise.all([loadFonts(), ensureWasm()])

  const serverLabel = session.server === 'undercity' ? 'Undercity' : 'Dragonveil'
  const serverColor = session.server === 'undercity' ? '#a78bfa'   : '#60a5fa'
  const dateStr     = formatDate(session.date as string, session.time as string | null, session.duration_minutes as number | null)
  const raidIconUrl = `https://nosapki.com/images/icons/${raid.icon}.png`
  const minLevel    = (session.min_level as number) ?? 0
  const maxPlayers  = session.max_players as number
  const leader      = session.leader_username as string | null
  const raidColor   = raid.color

  // 5 players per row → 4 rows max = 20 players total
  const PER_ROW = 5

  // Group by team preserving insertion order
  const teamMap = new Map<string, { name: string; sp: string | null }[]>()
  for (const p of players) {
    if (!teamMap.has(p.team)) teamMap.set(p.team, [])
    teamMap.get(p.team)!.push({ name: p.name, sp: p.sp })
  }
  const multiTeam = teamMap.size > 1

  // Build display rows: each team split into chunks of PER_ROW, cap total at 4 rows
  type DisplayRow = { label: string | null; ps: { name: string; sp: string | null }[] }
  const displayRows: DisplayRow[] = []
  for (const [teamName, ps] of teamMap) {
    for (let i = 0; i < ps.length; i += PER_ROW) {
      if (displayRows.length >= 4) break
      displayRows.push({ label: multiTeam && i === 0 ? teamName : null, ps: ps.slice(i, i + PER_ROW) })
    }
    if (displayRows.length >= 4) break
  }
  const hasRows = displayRows.length > 0

  function playerChip(p: { name: string; sp: string | null }): SatoriEl {
    return el('div', {
      style: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '6px', width: '200px',
      },
    },
      p.sp
        ? el('img', { src: p.sp, width: 64, height: 64, style: { borderRadius: '8px' } })
        : el('div', { style: { display: 'flex', width: '64px', height: '64px', background: '#1a1d2a', borderRadius: '8px' } }),
      el('span', { style: { color: '#d0d0e8', fontSize: '17px', textAlign: 'center', maxWidth: '190px' } }, p.name),
    )
  }

  function displayRow(row: DisplayRow): SatoriEl {
    return el('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
      row.label
        ? el('span', { style: { color: `${raidColor}cc`, fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' } }, row.label)
        : null,
      el('div', { style: { display: 'flex', gap: '8px' } },
        ...row.ps.map(playerChip),
      ),
    )
  }

  const image = el('div', {
    style: {
      display:       'flex',
      flexDirection: 'column',
      width:         '1200px',
      height:        '630px',
      background:    '#0f1218',
      fontFamily:    'Inter',
    },
  },
    // Top accent bar
    el('div', { style: { display: 'flex', height: '6px', background: raidColor, width: '100%' } }),

    // ── Compact top banner ─────────────────────────────────────────────────────
    el('div', {
      style: {
        display:    'flex',
        alignItems: 'center',
        gap:        '24px',
        padding:    '14px 48px',
        background: '#0b0d13',
      },
    },
      // Small raid icon
      el('img', {
        src:    raidIconUrl,
        width:  80,
        height: 80,
        style:  { borderRadius: '10px', border: `2px solid ${raidColor}55`, flexShrink: '0' },
      }),

      // Vertical divider
      el('div', { style: { display: 'flex', width: '2px', height: '70px', background: `${raidColor}55`, flexShrink: '0' } }),

      // Raid name + HC badge
      el('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: '0' } },
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
          el('span', { style: { color: raidColor, fontSize: '40px', fontWeight: 700, lineHeight: '1.0' } }, raid.name),
          raid.hc
            ? el('div', {
                style: {
                  display: 'flex', background: '#ff475722', border: '1px solid #ff475766',
                  borderRadius: '6px', padding: '3px 8px', alignSelf: 'center',
                },
              },
                el('span', { style: { color: '#ff4757', fontSize: '12px', fontWeight: 700, letterSpacing: '2px' } }, 'HC'),
              )
            : null,
        ),
        el('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
          el('span', {
            style: {
              color: serverColor, fontSize: '16px',
              border: `1px solid ${serverColor}55`, borderRadius: '20px', padding: '1px 10px',
            },
          }, serverLabel),
          minLevel > 0 ? el('span', { style: { color: '#888899', fontSize: '16px' } }, `HN ${minLevel}+`) : null,
        ),
      ),

      // Spacer
      el('div', { style: { display: 'flex', flex: '1' } }),

      // Date + leader + spots
      el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' } },
        el('span', { style: { color: '#d0d0e0', fontSize: '20px' } }, dateStr),
        el('div', { style: { display: 'flex', gap: '16px', alignItems: 'center' } },
          leader ? el('span', { style: { color: '#a0a0b8', fontSize: '16px' } }, `Chef : ${leader}`) : null,
          el('span', {
            style: {
              color: '#d0d0e0', fontSize: '16px',
              background: `${raidColor}22`, borderRadius: '20px', padding: '2px 12px',
              border: `1px solid ${raidColor}44`,
            },
          }, `${regCount} / ${maxPlayers} inscrits`),
        ),
        el('span', { style: { color: '#c9a96e', fontSize: '12px', fontWeight: 700, letterSpacing: '4px' } }, 'NOSBOOK'),
      ),
    ),

    // Divider
    el('div', { style: { display: 'flex', height: '1px', background: '#1e2230', width: '100%' } }),

    // ── Large players section ──────────────────────────────────────────────────
    hasRows
      ? el('div', {
          style: {
            display:        'flex',
            flex:           '1',
            flexDirection:  'column',
            justifyContent: 'center',
            padding:        '16px 48px',
            gap:            '20px',
          },
        },
          ...displayRows.map(row => displayRow(row)),
        )
      : el('div', {
          style: {
            display: 'flex', flex: '1', alignItems: 'center', justifyContent: 'center',
          },
        },
          el('span', { style: { color: '#444460', fontSize: '22px' } }, 'Aucun inscrit pour le moment'),
        ),

    // Bottom accent bar
    el('div', { style: { display: 'flex', height: '6px', background: raidColor, width: '100%' } }),
  )

  const svg = await satori(image, {
    width:  1200,
    height: 630,
    fonts:  [
      { name: 'Inter', data: fontRegular!, weight: 400, style: 'normal' },
      { name: 'Inter', data: fontBold!,    weight: 700, style: 'normal' },
    ],
  })

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
  return resvg.render().asPng()
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const id  = url.searchParams.get('id')
  const img = url.searchParams.get('img')

  if (!id) return new Response('Missing session id', { status: 400 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const [{ data: session }, { data: regs, count }] = await Promise.all([
    supabase.from('raid_sessions').select('*').eq('id', id).single(),
    supabase
      .from('raid_session_registrations')
      .select('sp_card_icon, character_snapshot, team_name', { count: 'exact' })
      .eq('session_id', id),
  ])

  if (!session) return new Response('Session not found', { status: 404 })

  type Reg = { sp_card_icon: string | null; character_snapshot: { name: string } | null; team_name: string | null }
  const regCount = count ?? 0
  // Only non-bench players (team_name !== null) for the image
  const players = ((regs ?? []) as Reg[])
    .filter(r => r.team_name !== null && r.character_snapshot?.name)
    .map(r => ({ name: r.character_snapshot!.name, sp: r.sp_card_icon ?? null, team: r.team_name as string }))
  const raid = getRaid(session.raid_slug)

  const supabaseUrl   = Deno.env.get('SUPABASE_URL')!
  const objectPath    = `${id}.png`
  const storagePngUrl = `${supabaseUrl}/storage/v1/object/public/og-images/${objectPath}`

  // ── Serve PNG image — génère + stocke en Storage ─────────────────────────
  if (img === '1') {
    try {
      // Always regenerate (frais à chaque Partager) + upload en Storage pour Discord
      await supabase.storage.createBucket('og-images', { public: true }).catch(() => {})
      const png = await generateImage(session, raid, regCount, players)
      await supabase.storage.from('og-images').upload(objectPath, png, {
        contentType: 'image/png', cacheControl: '3600', upsert: true,
      }).catch(() => {})
      return new Response(png, {
        headers: {
          'Content-Type':   'image/png',
          'Cache-Control':  'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message + '\n' + err.stack : String(err)
      console.error('Image generation error:', msg)
      return new Response(msg, { status: 500, headers: { 'Content-Type': 'text/plain' } })
    }
  }

  // ── Serve HTML avec OG meta ──────────────────────────────────────────────
  // Utilise l'URL Storage si l'image a déjà été pré-générée (via bouton Partager)
  const sessionUrl = `${APP_URL}/raids/${id}`
  let imageUrl = `${FN_BASE}?id=${encodeURIComponent(id)}&img=1`
  try {
    const head = await fetch(storagePngUrl, { method: 'HEAD' })
    if (head.ok) imageUrl = storagePngUrl
  } catch (_) { /* keep dynamic URL */ }
  const serverLabel = session.server === 'undercity' ? 'Undercity' : 'Dragonveil'
  const dateStr     = formatDate(session.date, session.time, session.duration_minutes)
  const title       = `${raid.name}${raid.hc ? ' (HC)' : ''} · ${serverLabel}`
  const desc        = [
    dateStr,
    session.leader_username ? `Chef : ${session.leader_username}` : null,
    (session.min_level ?? 0) > 0 ? `HN ${session.min_level}+` : null,
    `${regCount}/${session.max_players} inscrits`,
  ].filter(Boolean).join(' · ')

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

  return new Response(new TextEncoder().encode(html), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
})
