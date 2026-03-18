// ============================================================
// NosBook — useMarket hook
// All Supabase operations for the market feature.
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, hasSupabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { LISTING_STATUS, OFFER_STATUS, isExpired } from '@/lib/market'

// ── Moderation helpers (usable in any component) ───────────

/**
 * Returns true if the profile is permanently banned from the market.
 */
export function isBanned(profile) {
  return profile?.is_banned === true
}

/**
 * Returns true if the profile is currently muted (temporary restriction).
 */
export function isMuted(profile) {
  if (!profile?.muted_until) return false
  return new Date(profile.muted_until) > new Date()
}

// ── Helpers ────────────────────────────────────────────────

function fromDBListing(row) {
  return {
    id:                  row.id,
    type:                row.type,
    profileId:           row.profile_id,
    server:              row.server,
    title:               row.title,
    description:         row.description ?? '',
    tags:                row.tags ?? [],
    imageUrls:           row.image_urls ?? [],
    basePrice:           row.base_price ?? null,
    buyoutPrice:         row.buyout_price ?? null,
    status:              row.status,
    confirmationPending: row.confirmation_pending,
    acceptedOfferId:     row.accepted_offer_id ?? null,
    blockedProfiles:     row.blocked_profiles ?? [],
    lastActivityAt:      row.last_activity_at,
    createdAt:           row.created_at,
    // Joined fields (may be null if not fetched)
    profile:             row.profiles ?? null,
    offers:              (row.market_offers ?? []).map(fromDBOffer),
  }
}

function fromDBOffer(row) {
  return {
    id:            row.id,
    listingId:     row.listing_id,
    profileId:     row.profile_id,
    price:         row.price ?? null,
    comment:       row.comment ?? '',
    imageUrl:      row.image_url ?? null,
    characterName: row.character_name ?? null,
    discordHandle: row.discord_handle ?? null,
    status:        row.status,
    createdAt:     row.created_at,
    profile:       row.profiles ?? null,
  }
}

// ── Listing queries ────────────────────────────────────────

// Nombre d'annonces chargées par page (infinite scroll)
const PAGE_SIZE = 20

/**
 * Fetch active listings with their offer count and seller profile.
 * Supports infinite scroll: returns hasMore + loadMore().
 * Filters out listings inactive for 30+ days on the client side
 * (Supabase free tier doesn't support pg_cron; auto-archive is
 * handled lazily on read, and a nightly function could be added later).
 *
 * @param {{ type?: string, server?: string, tags?: string[], search?: string }} filters
 */
export function useMarketListings(filters = {}) {
  const [listings,     setListings]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [error,        setError]        = useState(null)
  const [hasMore,      setHasMore]      = useState(false)
  // useRef pour suivre la page courante sans provoquer de re-render
  const pageRef = useRef(0)

  // Construit la requête de base (sans .range) selon les filtres courants
  const buildQuery = useCallback(() => {
    let q = supabase
      .from('market_listings')
      .select(`
        *,
        profiles!profile_id ( id, username, discord_handle, trades_completed, trades_reported, server ),
        market_offers!listing_id ( id, profile_id, price, comment, character_name, discord_handle, status, created_at, profiles!profile_id ( id, username ) )
      `)
      .in('status', [LISTING_STATUS.ACTIVE, LISTING_STATUS.SOLD])
      .order('last_activity_at', { ascending: false })
    if (filters.type)         q = q.eq('type', filters.type)
    if (filters.server)       q = q.eq('server', filters.server)
    if (filters.tags?.length) q = q.overlaps('tags', filters.tags)
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      q = q.or(`title.ilike.${term},description.ilike.${term}`)
    }
    return q
  }, [filters.type, filters.server, JSON.stringify(filters.tags), filters.search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Charge une page donnée.  replace=true → réinitialise la liste (changement de filtres).
  const fetchPage = useCallback(async (pageIndex, replace) => {
    if (!hasSupabase) { if (replace) setLoading(false); return }
    if (replace) { setLoading(true); setError(null) }
    else setLoadingMore(true)

    try {
      const from = pageIndex * PAGE_SIZE
      const to   = from + PAGE_SIZE - 1
      const { data, error: err } = await buildQuery().range(from, to)
      if (err) throw err

      // Filtre côté client les annonces expirées (actives ET vendues >30j)
      const visible = (data ?? []).filter(r => !isExpired(r.last_activity_at))
      const mapped  = visible.map(fromDBListing)

      if (replace) setListings(mapped)
      else         setListings(prev => [...prev, ...mapped])

      // S'il y a exactement PAGE_SIZE résultats, il peut y en avoir d'autres
      setHasMore((data ?? []).length === PAGE_SIZE)

      // Fire-and-forget : auto-archive des annonces expirées découvertes
      const expired = (data ?? []).filter(r => isExpired(r.last_activity_at))
      if (expired.length) {
        supabase.from('market_listings')
          .update({ status: LISTING_STATUS.ARCHIVED })
          .in('id', expired.map(r => r.id))
          .then(() => {})
      }
    } catch (e) {
      setError(e.message)
    } finally {
      if (replace) setLoading(false)
      else         setLoadingMore(false)
    }
  }, [buildQuery])

  // Réinitialise et recharge depuis la page 0 à chaque changement de filtres
  useEffect(() => {
    pageRef.current = 0
    fetchPage(0, true)
  }, [fetchPage])

  // Charge la page suivante (appelé par IntersectionObserver dans MarketPage)
  function loadMore() {
    if (loadingMore || !hasMore) return
    pageRef.current += 1
    fetchPage(pageRef.current, false)
  }

  // refetch repart de la page 0 (utilisé après create/archive/edit)
  function refetch() {
    pageRef.current = 0
    fetchPage(0, true)
  }

  return { listings, loading, loadingMore, error, hasMore, loadMore, refetch }
}

/**
 * Fetch a single listing with full offer details.
 */
export function useMarketListing(listingId) {
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    if (!hasSupabase || !listingId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('market_listings')
        .select(`
          *,
          profiles!profile_id ( id, username, discord_handle, trades_completed, trades_reported, server ),
          market_offers!listing_id (
            *,
            profiles!profile_id ( id, username, trades_completed, trades_reported )
          )
        `)
        .eq('id', listingId)
        .single()

      if (err) throw err
      setListing(fromDBListing(data))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [listingId])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!hasSupabase || !listingId) return
    const channel = supabase
      .channel(`listing-${listingId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_offers', filter: `listing_id=eq.${listingId}` }, () => { fetch() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_listings', filter: `id=eq.${listingId}` }, () => { fetch() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [listingId, fetch])

  return { listing, loading, error, refetch: fetch }
}

/**
 * Fetch the current user's own listings (all statuses).
 */
export function useMyListings() {
  const { user } = useAuth()
  const [listings, setListings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const fetch = useCallback(async () => {
    if (!hasSupabase || !user) { setListings([]); setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('market_listings')
        .select(`
          *,
          profiles!profile_id ( id, username, discord_handle, trades_completed, trades_reported, server ),
          market_offers!listing_id ( id, profile_id, price, comment, character_name, discord_handle, status, created_at, profiles!profile_id ( id, username ) )
        `)
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })

      if (err) throw err
      setListings((data ?? []).map(fromDBListing))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { fetch() }, [fetch])

  return { listings, loading, error, refetch: fetch }
}

// ── Mutations ──────────────────────────────────────────────

/**
 * Create a new listing.
 * Returns { data, error }.
 */
export async function createListing({ profileId, server, type, title, description, tags, imageUrls, basePrice, buyoutPrice }) {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  const { data, error } = await supabase
    .from('market_listings')
    .insert({
      profile_id:   profileId,
      server,
      type,
      title:        title.trim(),
      description:  description?.trim() ?? null,
      tags:         tags ?? [],
      image_urls:   imageUrls ?? [],
      base_price:   basePrice   ?? null,
      buyout_price: buyoutPrice ?? null,
    })
    .select()
    .single()
  return { data: data ? fromDBListing(data) : null, error }
}

/**
 * Update a listing's metadata (title, description, tags, images).
 * Also resets last_activity_at to now (counts as activity).
 */
export async function updateListing(listingId, updates) {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  const { data, error } = await supabase
    .from('market_listings')
    .update({
      ...updates,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', listingId)
    .select()
    .single()
  return { data: data ? fromDBListing(data) : null, error }
}

/**
 * Bump a listing — resets last_activity_at to now, pushing it to top.
 * Cooldown (24h) is enforced client-side only via listing.lastActivityAt.
 */
export async function bumpListing(listingId) {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  const { error } = await supabase
    .from('market_listings')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', listingId)
  return { error }
}

/**
 * Archive a listing (by owner or admin).
 */
export async function archiveListing(listingId) {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  const { error } = await supabase
    .from('market_listings')
    .update({ status: LISTING_STATUS.ARCHIVED })
    .eq('id', listingId)
  return { error }
}

// ── Offers ─────────────────────────────────────────────────

/**
 * Submit an offer (bid or buy response).
 * Delegates to the create_offer RPC (SECURITY DEFINER) which :
 *   1. Checks anti-spam cooldown (market_offer_cooldowns).
 *      If active → throws 'COOLDOWN:<minutes>' parsed into error.cooldownMinutes.
 *   2. Inserts the offer and refreshes last_activity_at.
 * Using an RPC prevents bypassing the cooldown via direct API calls.
 */
export async function createOffer({ listingId, price, comment, imageUrl, characterName, discordHandle, notifyOutbid = true }) {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }

  const { data, error } = await supabase.rpc('create_offer', {
    p_listing_id:     listingId,
    p_price:          price                  ?? null,
    p_comment:        comment?.trim()        ?? null,
    p_image_url:      imageUrl               ?? null,
    p_character_name: characterName?.trim()  ?? null,
    p_discord_handle: discordHandle?.trim()  ?? null,
    p_notify_outbid:  notifyOutbid ?? true,
  })

  if (error) {
    // Erreur cooldown anti-spam : format "COOLDOWN:<minutes>"
    const match = error.message?.match(/COOLDOWN:(\d+)/)
    if (match) {
      return {
        data: null,
        error: { ...error, cooldownMinutes: parseInt(match[1], 10) },
      }
    }
    return { data: null, error }
  }

  return { data: data ? fromDBOffer(data) : null, error: null }
}

/**
 * Cancel an offer (by the offer owner).
 * Cancelled offers do NOT reset last_activity_at.
 */
export async function cancelOffer(offerId) {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  // Utilise une fonction SECURITY DEFINER pour : (1) annuler l'offre,
  // (2) réinitialiser confirmation_pending sur l'annonce si besoin —
  // le buyer n'a pas de droit UPDATE direct sur market_listings (RLS).
  const { error } = await supabase.rpc('cancel_offer', { p_offer_id: offerId })
  return { error }
}

/**
 * Reject an offer (by the listing owner).
 * Calls the reject_offer DB function which verifies ownership.
 */
export async function rejectOffer(offerId) {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  const { error } = await supabase.rpc('reject_offer', { p_offer_id: offerId })
  return { error }
}

/**
 * Seller triggers confirmation for a specific offer
 * (or when buyout price is reached automatically).
 * Sets confirmation_pending = true and accepted_offer_id.
 */
export async function triggerConfirmation(listingId, offerId) {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  const { error } = await supabase
    .from('market_listings')
    .update({
      confirmation_pending: true,
      accepted_offer_id:    offerId,
    })
    .eq('id', listingId)

  // TODO(emails): à activer après config Resend + déploiement notify-market
  // if (!error) {
  //   supabase.functions.invoke('notify-market', {
  //     body: { type: 'offer_selected', listingId, offerId },
  //   }).catch(() => {})
  // }

  return { error }
}

/**
 * Seller confirms the sale (calls DB function).
 */
export async function confirmSale(listingId) {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  const { error } = await supabase.rpc('confirm_market_sale', {
    p_listing_id: listingId,
  })

  // TODO(emails): à activer après config Resend + déploiement notify-market
  // if (!error) {
  //   supabase.functions.invoke('notify-market', {
  //     body: { type: 'sale_confirmed', listingId },
  //   }).catch(() => {})
  // }

  return { error }
}

/**
 * Seller rejects the pending offer and reopens the listing.
 */
export async function rejectConfirmation(listingId) {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  const { error } = await supabase
    .from('market_listings')
    .update({
      confirmation_pending: false,
      accepted_offer_id:    null,
    })
    .eq('id', listingId)
  return { error }
}

// ── Reports ────────────────────────────────────────────────

/**
 * File a report against a buyer.
 */
export async function createReport({ listingId, offerId, reportedBy, reportedProfileId, reason }) {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  const { data, error } = await supabase
    .from('market_reports')
    .insert({
      listing_id:          listingId,
      offer_id:            offerId ?? null,
      reported_by:         reportedBy,
      reported_profile_id: reportedProfileId,
      reason:              reason.trim(),
    })
    .select()
    .single()
  return { data, error }
}

/**
 * Admin: fetch all reports (optionally filtered by status).
 */
export async function fetchReports(status = null) {
  if (!hasSupabase) return { data: [], error: null }
  let query = supabase
    .from('market_reports')
    .select(`
      *,
      reported_by_profile:profiles!market_reports_reported_by_fkey ( id, username ),
      reported_profile:profiles!market_reports_reported_profile_id_fkey ( id, username, trades_reported ),
      market_listings ( id, title, server ),
      market_offers ( id, price, comment )
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error || !data?.length) return { data: data ?? [], error }

  // Fetch muted_until / is_banned separately to avoid PostgREST double-join alias bug
  const profileIds = [...new Set(data.map(r => r.reported_profile_id).filter(Boolean))]
  if (profileIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, muted_until, is_banned')
      .in('id', profileIds)
    const modMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
    data.forEach(r => {
      if (r.reported_profile && modMap[r.reported_profile_id]) {
        r.reported_profile.muted_until = modMap[r.reported_profile_id].muted_until
        r.reported_profile.is_banned   = modMap[r.reported_profile_id].is_banned
      }
    })
  }

  return { data, error: null }
}

/**
 * Admin: validate a report (calls DB function).
 */
export async function validateReport(reportId, adminNote = '') {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  const { error } = await supabase.rpc('validate_market_report', {
    p_report_id:  reportId,
    p_admin_note: adminNote || null,
  })
  return { error }
}

/**
 * Admin: apply a moderation action to a profile (calls DB function).
 * action: 'mute' | 'ban' | 'unmute' | 'unban'
 * durationDays: required for 'mute', ignored otherwise.
 */
export async function setModeration(profileId, action, durationDays = null) {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  const { error } = await supabase.rpc('admin_set_moderation', {
    p_profile_id:    profileId,
    p_action:        action,
    p_duration_days: durationDays ?? null,
  })
  return { error }
}

/**
 * Admin: fetch all currently muted or banned profiles.
 */
export async function fetchModeratedProfiles() {
  if (!hasSupabase) return { data: [], error: null }
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, is_banned, muted_until, trades_completed, trades_reported')
    .or(`is_banned.eq.true,muted_until.gt.${now}`)
    .order('is_banned', { ascending: false })
    .order('muted_until', { ascending: false })
  return { data: data ?? [], error }
}

/**
 * Admin/Modérateur: reject a report (via RPC SECURITY DEFINER pour log + accès mod).
 */
export async function rejectReport(reportId, adminNote = '') {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  const { error } = await supabase.rpc('mod_reject_report', {
    p_report_id:  reportId,
    p_admin_note: adminNote || null,
  })
  return { error }
}

// ── Follows ────────────────────────────────────────────────

/**
 * Load the set of listing IDs the current user follows.
 * Returns a Set<string> for O(1) lookup in ListingCard.
 */
export function useMyFollows() {
  const { user } = useAuth()
  const [followedIds, setFollowedIds] = useState(new Set())
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(async () => {
    if (!hasSupabase || !user) { setFollowedIds(new Set()); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('market_follows')
      .select('listing_id')
      .eq('profile_id', user.id)
    setFollowedIds(new Set((data ?? []).map(r => r.listing_id)))
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const toggle = useCallback(async (listingId) => {
    if (!user) return
    const isFollowed = followedIds.has(listingId)
    // Optimistic update
    setFollowedIds(prev => {
      const next = new Set(prev)
      isFollowed ? next.delete(listingId) : next.add(listingId)
      return next
    })
    if (isFollowed) {
      await supabase
        .from('market_follows')
        .delete()
        .eq('profile_id', user.id)
        .eq('listing_id', listingId)
    } else {
      await supabase
        .from('market_follows')
        .insert({ profile_id: user.id, listing_id: listingId })
    }
  }, [user?.id, followedIds])

  return { followedIds, loading, toggle }
}

/**
 * Fetch full listing data for all listings the user follows.
 */
export function useFollowedListings() {
  const { user } = useAuth()
  const [listings, setListings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const fetch = useCallback(async () => {
    if (!hasSupabase || !user) { setListings([]); setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('market_follows')
        .select(`
          listing_id,
          market_listings!listing_id (
            *,
            profiles!profile_id ( id, username, discord_handle, trades_completed, trades_reported, server ),
            market_offers!listing_id ( id, profile_id, price, status, created_at )
          )
        `)
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
      if (err) throw err
      const listings = (data ?? [])
        .map(r => r.market_listings)
        .filter(Boolean)
        .map(fromDBListing)
      setListings(listings)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { fetch() }, [fetch])

  return { listings, loading, error, refetch: fetch }
}
