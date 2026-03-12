// ============================================================
// notify-market — Supabase Edge Function
// Sends transactional emails via Resend when market events occur.
//
// Events:
//   offer_selected  → email to SELLER: buyer name, discord, price, listing link
//   sale_confirmed  → email to BUYER:  seller name, discord, listing link
//
// Required secrets (set via `supabase secrets set`):
//   RESEND_API_KEY
//   APP_URL              (e.g. https://nosbook.gg)
//   SUPABASE_URL         (auto-provided by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY') ?? ''
const APP_URL               = Deno.env.get('APP_URL')        ?? 'https://nosbook.gg'
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')   ?? ''
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const FROM_EMAIL = 'NosBook Market <notifications@nosbook.gg>'

// ── Supabase admin client ─────────────────────────────────
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

// ── Resend helper ─────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
  return res.json()
}

// ── Get user email from Supabase Auth ────────────────────
async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await db.auth.admin.getUserById(userId)
  if (error || !data?.user?.email) return null
  return data.user.email
}

// ── Handler: offer selected (seller notified) ────────────
async function handleOfferSelected(listingId: string, offerId: string) {
  // Fetch listing + seller profile
  const { data: listing, error: listErr } = await db
    .from('market_listings')
    .select('id, title, profile_id, profiles!market_listings_profile_id_fkey(username, discord_handle)')
    .eq('id', listingId)
    .single()

  if (listErr || !listing) throw new Error('Listing not found')

  // Fetch offer + buyer profile
  const { data: offer, error: offerErr } = await db
    .from('market_offers')
    .select('id, price, profile_id, profiles!market_offers_profile_id_fkey(username, discord_handle)')
    .eq('id', offerId)
    .single()

  if (offerErr || !offer) throw new Error('Offer not found')

  const sellerEmail = await getUserEmail(listing.profile_id)
  if (!sellerEmail) return // seller has no email on file

  const seller = (listing as any).profiles
  const buyer  = (offer as any).profiles
  const price  = offer.price != null ? new Intl.NumberFormat('fr-FR').format(offer.price) + ' or' : 'prix non défini'
  const link   = `${APP_URL}/market/${listing.id}`

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1d24;">
      <div style="background:#c9a84c;padding:16px 24px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;color:#0d0f14;">🏷️ NosBook Market</h2>
      </div>
      <div style="background:#1a1d24;color:#e8e8e8;padding:24px;border-radius:0 0 8px 8px;border:1px solid #2a2d38;">
        <p>Bonjour <strong>${seller?.username ?? 'vendeur'}</strong>,</p>
        <p>Une offre a été acceptée sur votre annonce <strong>${listing.title}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="color:#9ca3af;padding:4px 0;width:140px;">Acheteur</td><td style="color:#c9a84c;font-weight:700;">${buyer?.username ?? '—'}</td></tr>
          <tr><td style="color:#9ca3af;padding:4px 0;">Discord</td><td>${buyer?.discord_handle ? `<span style="color:#7c83e0;">${buyer.discord_handle}</span>` : '<em style="color:#6b7280;">non renseigné</em>'}</td></tr>
          <tr><td style="color:#9ca3af;padding:4px 0;">Prix proposé</td><td style="color:#4ade80;font-weight:700;">${price}</td></tr>
        </table>
        <p style="color:#9ca3af;font-size:0.9em;">Contactez l'acheteur pour finaliser l'échange, puis confirmez la vente depuis l'annonce.</p>
        <a href="${link}" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#c9a84c;color:#0d0f14;text-decoration:none;border-radius:6px;font-weight:700;">Voir l'annonce</a>
      </div>
      <p style="font-size:0.75em;color:#6b7280;text-align:center;margin-top:12px;">NosBook · Vous recevez cet email car vous avez une annonce active.</p>
    </div>
  `

  await sendEmail(sellerEmail, `[NosBook] Offre acceptée sur "${listing.title}"`, html)
}

// ── Handler: sale confirmed (buyer notified) ─────────────
async function handleSaleConfirmed(listingId: string) {
  // Fetch listing with accepted_offer_id + seller profile
  const { data: listing, error: listErr } = await db
    .from('market_listings')
    .select('id, title, profile_id, accepted_offer_id, profiles!market_listings_profile_id_fkey(username, discord_handle)')
    .eq('id', listingId)
    .single()

  if (listErr || !listing) throw new Error('Listing not found')
  if (!listing.accepted_offer_id) return

  // Fetch buyer profile via the accepted offer
  const { data: offer, error: offerErr } = await db
    .from('market_offers')
    .select('profile_id, profiles!market_offers_profile_id_fkey(username, discord_handle)')
    .eq('id', listing.accepted_offer_id)
    .single()

  if (offerErr || !offer) throw new Error('Offer not found')

  const buyerEmail = await getUserEmail(offer.profile_id)
  if (!buyerEmail) return

  const seller = (listing as any).profiles
  const buyer  = (offer as any).profiles
  const link   = `${APP_URL}/market/${listing.id}`

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1d24;">
      <div style="background:#22c55e;padding:16px 24px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;color:#0d0f14;">✅ NosBook Market</h2>
      </div>
      <div style="background:#1a1d24;color:#e8e8e8;padding:24px;border-radius:0 0 8px 8px;border:1px solid #2a2d38;">
        <p>Bonjour <strong>${buyer?.username ?? 'acheteur'}</strong>,</p>
        <p>Votre échange sur <strong>${listing.title}</strong> a été confirmé par le vendeur. 🎉</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="color:#9ca3af;padding:4px 0;width:140px;">Vendeur</td><td style="color:#c9a84c;font-weight:700;">${seller?.username ?? '—'}</td></tr>
          <tr><td style="color:#9ca3af;padding:4px 0;">Discord</td><td>${seller?.discord_handle ? `<span style="color:#7c83e0;">${seller.discord_handle}</span>` : '<em style="color:#6b7280;">non renseigné</em>'}</td></tr>
        </table>
        <p style="color:#9ca3af;font-size:0.9em;">Si vous avez besoin de contacter le vendeur pour finaliser la remise, utilisez son Discord ci-dessus.</p>
        <a href="${link}" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#22c55e;color:#0d0f14;text-decoration:none;border-radius:6px;font-weight:700;">Voir l'annonce</a>
      </div>
      <p style="font-size:0.75em;color:#6b7280;text-align:center;margin-top:12px;">NosBook · Vous recevez cet email car vous avez participé à une transaction.</p>
    </div>
  `

  await sendEmail(buyerEmail, `[NosBook] Échange confirmé — ${listing.title}`, html)
}

// ── Main handler ──────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { type, listingId, offerId } = await req.json()

    if (!type || !listingId) {
      return new Response(JSON.stringify({ error: 'Missing type or listingId' }), { status: 400 })
    }

    if (type === 'offer_selected') {
      if (!offerId) return new Response(JSON.stringify({ error: 'Missing offerId' }), { status: 400 })
      await handleOfferSelected(listingId, offerId)
    } else if (type === 'sale_confirmed') {
      await handleSaleConfirmed(listingId)
    } else {
      return new Response(JSON.stringify({ error: 'Unknown type' }), { status: 400 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[notify-market]', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
