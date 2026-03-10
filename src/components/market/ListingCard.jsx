// ============================================================
// ListingCard — displays one market listing in the grid.
// Shows: title, tags, server, prices, best offer, seller info,
// expiry countdown, and action buttons based on context.
// ============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { MARKET_TAGS, formatGold, bestOffer, LISTING_STATUS, OFFER_STATUS } from '@/lib/market'
import { isBanned, isMuted } from '@/hooks/useMarket'
import {
  archiveListing,
  bumpListing,
  triggerConfirmation,
  confirmSale,
  rejectConfirmation,
  cancelOffer,
  rejectOffer,
} from '@/hooks/useMarket'
import OfferModal  from './OfferModal'
import ReportModal from './ReportModal'
import styles from './ListingCard.module.css'

// ── Helpers ────────────────────────────────────────────────

function daysLeft(lastActivityAt) {
  const ms = 30 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(lastActivityAt).getTime())
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

function ServerBadge({ server }) {
  const color = server === 'undercity' ? '#6a5acd' : '#20b2aa'
  const label = server === 'undercity' ? 'Undercity' : 'Dragonveil'
  return (
    <span className={styles.serverBadge} style={{ '--server-color': color }}>
      {label}
    </span>
  )
}

function TagPill({ slug, t }) {
  const tagDef = MARKET_TAGS.find(tg => tg.slug === slug)
  return (
    <span className={styles.tagPill}>
      {tagDef?.icon} {t(`market.tags.${slug}`)}
    </span>
  )
}

// ── ListingCard ────────────────────────────────────────────

export default function ListingCard({ listing, onRefresh, userProfile, userCharServers = [], isFollowed = false, onToggleFollow }) {
  const { t } = useLang()
  const { user } = useAuth()

  const [showOfferModal,       setShowOfferModal]       = useState(false)
  const [showReportModal,      setShowReportModal]      = useState(false)
  // Spam report state: { offerId, reportedProfileId } | null
  const [spamReportTarget,     setSpamReportTarget]     = useState(null)
  const [actionLoading,        setActionLoading]        = useState(false)

  const isSell    = listing.type === 'sell'
  const isOwner   = user?.id === listing.profileId
  const isBlocked = listing.blockedProfiles.includes(user?.id)
  const isPending = listing.confirmationPending
  const isSold    = listing.status === LISTING_STATUS.SOLD

  // Offers — raw rows from Supabase keep snake_case; handle both.
  const offers = listing.offers ?? []

  // profile_id can be snake_case (raw row) or camelCase (fromDBOffer mapped)
  const getOfferProfileId = (o) => o.profileId ?? o.profile_id
  const getOfferStatus    = (o) => o.status
  // Username: from nested profiles join (snake_case raw) or camelCase mapped
  const getOfferUsername  = (o) => o.profiles?.username ?? o.profile?.username ?? '—'

  const activeOffers = offers.filter(o => getOfferStatus(o) === OFFER_STATUS.ACTIVE)
  const top          = bestOffer(offers)

  // The current user's own active offer on this listing
  const myOffer = offers.find(
    o => getOfferProfileId(o) === user?.id && getOfferStatus(o) === OFFER_STATUS.ACTIVE
  )

  // The current user's rejected offer (blocks re-bidding)
  const myRejectedOffer = offers.find(
    o => getOfferProfileId(o) === user?.id && getOfferStatus(o) === OFFER_STATUS.REJECTED
  )

  // Mute / ban check on the current user (viewer)
  const viewerBanned = isBanned(userProfile)
  const viewerMuted  = isMuted(userProfile)
  const viewerRestricted = viewerBanned || viewerMuted

  // Can the current user make an offer?
  const canOffer = (
    user &&
    !isOwner &&
    !isBlocked &&
    !isPending &&
    !isSold &&
    !viewerRestricted &&
    !myRejectedOffer &&
    userCharServers.includes(listing.server)
  )

  // Restriction message for the viewer (shown instead of offer button)
  const restrictionMsg = viewerBanned
    ? t('market.bannedCannotOffer')
    : viewerMuted
      ? t('market.mutedCannotOffer')
      : null

  // Bump cooldown — 24h since last activity
  const BUMP_COOLDOWN_MS = 24 * 60 * 60 * 1000
  const msSinceActivity  = listing.lastActivityAt
    ? Date.now() - new Date(listing.lastActivityAt).getTime()
    : BUMP_COOLDOWN_MS
  const canBump           = isOwner && !isSold && listing.status === LISTING_STATUS.ACTIVE && !isPending && msSinceActivity >= BUMP_COOLDOWN_MS
  const bumpCooldownHours = Math.ceil((BUMP_COOLDOWN_MS - msSinceActivity) / (60 * 60 * 1000))

  // ── Actions ──────────────────────────────────────────────

  async function handleBump() {
    setActionLoading(true)
    await bumpListing(listing.id)
    setActionLoading(false)
    onRefresh?.()
  }

  async function handleArchive() {
    if (!window.confirm(t('market.archiveListing') + ' ?')) return
    setActionLoading(true)
    await archiveListing(listing.id)
    setActionLoading(false)
    onRefresh?.()
  }

  async function handleConfirmSale() {
    setActionLoading(true)
    await confirmSale(listing.id)
    setActionLoading(false)
    onRefresh?.()
  }

  async function handleRejectConfirmation() {
    setActionLoading(true)
    await rejectConfirmation(listing.id)
    setActionLoading(false)
    onRefresh?.()
  }

  async function handleSelectOffer(offerId) {
    setActionLoading(true)
    await triggerConfirmation(listing.id, offerId)
    setActionLoading(false)
    onRefresh?.()
  }

  async function handleRejectOffer(offerId) {
    if (!window.confirm(t('market.rejectOfferConfirm'))) return
    setActionLoading(true)
    const { error } = await rejectOffer(offerId)
    setActionLoading(false)
    if (error) { console.error('rejectOffer error:', error); return }
    onRefresh?.()
  }

  async function handleCancelOffer() {
    if (!window.confirm(t('market.cancelOfferConfirm'))) return
    setActionLoading(true)
    await cancelOffer(myOffer.id)
    setActionLoading(false)
    onRefresh?.()
  }

  function handleSpamReport(offer) {
    const reportedProfileId = getOfferProfileId(offer)
    if (!reportedProfileId) return
    setSpamReportTarget({ offerId: offer.id, reportedProfileId })
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className={`${styles.card} ${isPending ? styles.cardPending : ''} ${isSold ? styles.cardSold : ''}`}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={`${styles.typeBadge} ${isSell ? styles.typeSell : styles.typeBuy}`}>
            {isSell ? '🏷️ WTS' : '🔍 WTB'}
          </span>
          <ServerBadge server={listing.server} />
        </div>
        <div className={styles.expiry}>
          {!isSold && listing.status === LISTING_STATUS.ACTIVE && (
            <span className={styles.expiryText}>
              ⏳ {daysLeft(listing.lastActivityAt)}{t('market.days')}
            </span>
          )}
          {isSold && <span className={styles.soldBadge}>{t('market.sold')}</span>}
        </div>
      </div>

      {/* Title + description */}
      <div className={styles.body}>
        <Link to={`/market/${listing.id}`} className={styles.titleLink}>
          <h3 className={styles.title}>{listing.title}</h3>
        </Link>
        {listing.description && (
          <p className={styles.desc}>{listing.description}</p>
        )}
      </div>

      {/* Tags */}
      {listing.tags.length > 0 && (
        <div className={styles.tags}>
          {listing.tags.map(slug => (
            <TagPill key={slug} slug={slug} t={t} />
          ))}
        </div>
      )}

      {/* Images */}
      {listing.imageUrls.length > 0 && (
        <div className={styles.images}>
          {listing.imageUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} alt="" className={styles.thumb} onError={e => { e.target.style.display = 'none' }} />
            </a>
          ))}
        </div>
      )}

      {/* Pricing (sell only) */}
      {isSell && (
        <div className={styles.pricing}>
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>{t('market.basePrice')}</span>
            <span className={styles.priceValue}>
              {listing.basePrice != null ? `${formatGold(listing.basePrice)} ${t('market.gold')}` : t('market.noBasePrice')}
            </span>
          </div>
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>{t('market.buyoutPrice')}</span>
            <span className={`${styles.priceValue} ${styles.buyoutValue}`}>
              {listing.buyoutPrice != null ? `${formatGold(listing.buyoutPrice)} ${t('market.gold')}` : t('market.noBuyoutPrice')}
            </span>
          </div>
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>{t('market.bestOffer')}</span>
            <span className={`${styles.priceValue} ${styles.bestValue}`}>
              {top ? `${formatGold(top.price)} ${t('market.gold')}` : t('market.noOffers')}
            </span>
          </div>
          <div className={styles.offerCount}>
            {activeOffers.length} {t('market.offersCount')}
          </div>
        </div>
      )}

      {/* Confirmation pending banner */}
      {isPending && isOwner && (
        <div className={styles.pendingBanner}>
          <p>{t('market.confirmPending')}</p>
          <div className={styles.pendingActions}>
            <button
              className={styles.btnConfirm}
              onClick={handleConfirmSale}
              disabled={actionLoading}
            >
              {t('market.confirmSale')}
            </button>
            <button
              className={styles.btnReject}
              onClick={handleRejectConfirmation}
              disabled={actionLoading}
            >
              {t('market.rejectOffer')}
            </button>
          </div>
        </div>
      )}

      {/* Offer list (owner view) — visible both when pending and when active */}
      {isOwner && isSell && activeOffers.length > 0 && (
        <div className={styles.offerList}>
          {activeOffers
            .sort((a, b) => ((b.price ?? b.price) ?? 0) - ((a.price ?? a.price) ?? 0))
            .map(offer => {
              const offerProfileId = getOfferProfileId(offer)
              const displayName    = offer.characterName ?? getOfferUsername(offer)
              return (
                <div key={offer.id} className={styles.offerRow}>
                  <div className={styles.offerIdentity}>
                    <span className={styles.offerProfile}>{displayName}</span>
                    {offer.discordHandle && (
                      <span className={styles.offerDiscord}>💬 {offer.discordHandle}</span>
                    )}
                  </div>
                  <span className={styles.offerPrice}>
                    {formatGold(offer.price)} {t('market.gold')}
                  </span>
                  {offer.comment && <span className={styles.offerComment}>{offer.comment}</span>}
                  <div className={styles.offerRowActions}>
                    {/* Accept offer (only when not in pending confirmation) */}
                    {!isPending && (
                      <button
                        className={styles.btnAcceptOffer}
                        onClick={() => handleSelectOffer(offer.id)}
                        disabled={actionLoading}
                        title={t('market.confirmSale')}
                      >
                        ✓
                      </button>
                    )}
                    {/* Reject offer */}
                    {!isPending && (
                      <button
                        className={styles.btnRejectOfferMini}
                        onClick={() => handleRejectOffer(offer.id)}
                        disabled={actionLoading}
                        title={t('market.rejectOffer')}
                      >
                        ✕
                      </button>
                    )}
                    {/* Report spam */}
                    {offerProfileId && offerProfileId !== user?.id && (
                      <button
                        className={styles.btnReportOffer}
                        onClick={() => handleSpamReport(offer)}
                        title={t('market.reportOfferTitle')}
                      >
                        {t('market.reportOfferBtn')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Seller info */}
      <div className={styles.footer}>
        <div className={styles.seller}>
          <span className={styles.sellerName}>
            {t('market.postedBy')} <strong>{listing.profile?.username ?? '—'}</strong>
          </span>
          {listing.profile?.discord_handle && (
            <span className={styles.discord}>
              💬 {listing.profile.discord_handle}
            </span>
          )}
          <span className={styles.reputation}>
            ✅ {listing.profile?.trades_completed ?? 0} · ⚠️ {listing.profile?.trades_reported ?? 0}
          </span>
        </div>

        {/* Action buttons */}
        <div className={styles.actions}>
          {/* Owner actions */}
          {isOwner && !isSold && (
            <button
              className={styles.btnArchive}
              onClick={handleArchive}
              disabled={actionLoading}
            >
              {t('market.archiveListing')}
            </button>
          )}

          {/* Owner: bump */}
          {isOwner && !isSold && listing.status === LISTING_STATUS.ACTIVE && !isPending && canBump && (
            <button
              className={styles.btnBump}
              onClick={handleBump}
              disabled={actionLoading}
              title={t('market.bumpTitle')}
            >
              ↑ {t('market.bumpListing')}
            </button>
          )}

          {/* Blocked */}
          {isBlocked && (
            <span className={styles.blockedMsg}>{t('market.blockedFromListing')}</span>
          )}

          {/* Muted / banned restriction message */}
          {!isOwner && !isBlocked && !isSold && viewerRestricted && (
            <span className={styles.restrictedMsg}>{restrictionMsg}</span>
          )}

          {/* Offer rejected — cannot re-bid */}
          {!isOwner && !isBlocked && !isSold && !viewerRestricted && myRejectedOffer && (
            <span className={styles.restrictedMsg}>{t('market.offerWasRejected')}</span>
          )}

          {/* Buyer: make offer */}
          {canOffer && !myOffer && (
            <button
              className={styles.btnOffer}
              onClick={() => setShowOfferModal(true)}
            >
              {isSell ? t('market.makeOffer') : t('market.respond')}
            </button>
          )}

          {/* Buyer: cancel own active offer */}
          {myOffer && (
            <button
              className={styles.btnCancelOffer}
              onClick={handleCancelOffer}
              disabled={actionLoading}
            >
              {t('market.cancelOffer')}
              {myOffer.price != null && ` (${formatGold(myOffer.price)} ${t('market.gold')})`}
            </button>
          )}

          {/* Non-owner: follow/unfollow */}
          {!isOwner && user && onToggleFollow && (
            <button
              className={`${styles.btnFollow} ${isFollowed ? styles.btnFollowActive : ''}`}
              onClick={() => onToggleFollow(listing.id)}
              title={isFollowed ? t('market.unfollow') : t('market.follow')}
            >
              🔖
              <span>{isFollowed ? t('market.unfollow') : t('market.follow')}</span>
            </button>
          )}

          {/* Seller: report non-payer (only when confirmation_pending) */}
          {isOwner && isPending && (
            <button
              className={styles.btnReport}
              onClick={() => setShowReportModal(true)}
            >
              {t('market.reportBuyer')}
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      {/* Bump cooldown note — shown at bottom of card when on cooldown */}
      {isOwner && !isSold && listing.status === LISTING_STATUS.ACTIVE && !isPending && !canBump && (
        <p className={styles.bumpBar}>
          ↑ {t('market.bumpCooldown', { h: bumpCooldownHours })}
        </p>
      )}

      {showOfferModal && (
        <OfferModal
          listing={listing}
          userProfile={userProfile}
          onClose={() => setShowOfferModal(false)}
          onSuccess={() => { setShowOfferModal(false); onRefresh?.() }}
        />
      )}

      {/* Non-payer report (triggered from pending banner) */}
      {showReportModal && listing.acceptedOfferId && (
        <ReportModal
          listing={listing}
          offerId={listing.acceptedOfferId}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => { setShowReportModal(false); onRefresh?.() }}
        />
      )}

      {/* Spam offer report (triggered from offer row ⚠️) */}
      {spamReportTarget && (
        <ReportModal
          listing={listing}
          offerId={spamReportTarget.offerId}
          reportedProfileId={spamReportTarget.reportedProfileId}
          mode="spam"
          onClose={() => setSpamReportTarget(null)}
          onSuccess={() => { setSpamReportTarget(null); onRefresh?.() }}
        />
      )}
    </div>
  )
}
