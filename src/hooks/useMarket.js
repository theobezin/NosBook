// ============================================================
// NosBook — useMarket hook
// All Supabase operations for the market feature.
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { supabase, hasSupabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { LISTING_STATUS, OFFER_STATUS, isExpired } from '@/lib/market'

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
    offers:              row.market_offers ?? [],
  }
}

function fromDBOffer(row) {
  return {
    id:        row.id,
    listingId: row.listing_id,
    profileId: row.profile_id,
    price:     row.price ?? null,
    comment:   row.comment ?? '',
    imageUrl:  row.image_url ?? null,
    status:    row.status,
    createdAt: row.created_at,
    profile:   row.profiles ?? null,
  }
}

// ── Listing queries ────────────────────────────────────────

/**
 * Fetch active listings with their offer count and seller profile.
 * Filters out listings inactive for 30+ days on the client side
 * (Supabase free tier doesn't support pg_cron; auto-archive is
 * handled lazily on read, and a nightly function could be added later).
 *
 * @param {{ type?: string, server?: string, tags?: string[], search?: string }} filters
 */
export function useMarketListings(filters = {}) {
  const [listings, setListings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const fetch = useCallback(async () => {
    if (!hasSupabase) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('market_listings')
        .select(`
          *,
          profiles!profile_id ( id, username, discord_handle, trades_completed, trades_reported, server ),
          market_offers!listing_id ( id, profile_id, price, status, created_at )
        `)
        .eq('status', LISTING_STATUS.ACTIVE)
        .order('last_activity_at', { ascending: false })

      if (filters.type)   query = query.eq('type', filters.type)
      if (filters.server) query = query.eq('server', filters.server)
      if (filters.tags?.length) query = query.overlaps('tags', filters.tags)
      // Full-text search on title + description (case-insensitive)
      if (filters.search?.trim()) {
        const term = `%${filters.search.trim()}%`
        query = query.or(`title.ilike.${term},description.ilike.${term}`)
      }

      const { data, error: err } = await query
      if (err) throw err

      // Client-side inactivity filter — archive lazily
      const active = (data ?? []).filter(r => !isExpired(r.last_activity_at))
      setListings(active.map(fromDBListing))

      // Fire-and-forget: auto-archive expired listings found above
      const expired = (data ?? []).filter(r => isExpired(r.last_activity_at))
      if (expired.length) {
        supabase
          .from('market_listings')
          .update({ status: LISTING_STATUS.ARCHIVED })
          .in('id', expired.map(r => r.id))
          .then(() => {})
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters.type, filters.server, JSON.stringify(filters.tags), filters.search])

  useEffect(() => { fetch() }, [fetch])

  return { listings, loading, error, refetch: fetch }
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
          market_offers!listing_id ( id, profile_id, price, status, created_at )
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
 * Also refreshes last_activity_at on the parent listing.
 */
export async function createOffer({ listingId, profileId, price, comment, imageUrl }) {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }

  const { data, error } = await supabase
    .from('market_offers')
    .insert({
      listing_id: listingId,
      profile_id: profileId,
      price:      price     ?? null,
      comment:    comment?.trim() ?? null,
      image_url:  imageUrl  ?? null,
    })
    .select()
    .single()

  if (!error) {
    // Update last_activity_at on the listing (non-blocking)
    supabase
      .from('market_listings')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', listingId)
      .then(() => {})
  }

  return { data: data ? fromDBOffer(data) : null, error }
}

/**
 * Cancel an offer (by the offer owner).
 * Cancelled offers do NOT reset last_activity_at.
 */
export async function cancelOffer(offerId) {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  const { error } = await supabase
    .from('market_offers')
    .update({ status: OFFER_STATUS.CANCELLED })
    .eq('id', offerId)
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
  return { data: data ?? [], error }
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
 * Admin: reject a report.
 */
export async function rejectReport(reportId, adminNote = '') {
  if (!hasSupabase) return { error: { message: 'Supabase non configuré' } }
  const { error } = await supabase
    .from('market_reports')
    .update({ status: 'rejected', admin_note: adminNote || null })
    .eq('id', reportId)
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
