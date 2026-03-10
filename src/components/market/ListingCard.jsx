// ============================================================
// ListingCard — displays one market listing in the grid.
// Shows: title, tags, server, prices, best offer, seller info,
// expiry countdown, and action buttons based on context.
// ============================================================
import { useState } from 'react'
import { useLang } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { MARKET_TAGS, formatGold, bestOffer, LISTING_STATUS, OFFER_STATUS } from '@/lib/market'
import {
  archiveListing,
  triggerConfirmation,
  confirmSale,
  rejectConfirmation,
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

  const [showOfferModal,  setShowOfferModal]  = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [actionLoading,   setActionLoading]   = useState(false)

  const isSell = listing.type === 'sell'
  const isOwner = user?.id === listing.profileId
  const isBlocked = listing.blockedProfiles.includes(user?.id)
  const isPending = listing.confirmationPending
  const isSold = listing.status === LISTING_STATUS.SOLD

  // Offers visible to listing owner + current user's own offers
  const visibleOffers = (listing.offers ?? []).filter(o =>
    isOwner || o.profileId === user?.id
  )
  const activeOffers = (listing.offers ?? []).filter(o => o.status === OFFER_STATUS.ACTIVE)
  const top = bestOffer(listing.offers ?? [])
  const myOffer = (listing.offers ?? []).find(o => o.profileId === user?.id && o.status === OFFER_STATUS.ACTIVE)

  // Can the current user make an offer?
  const canOffer = (
    user &&
    !isOwner &&
    !isBlocked &&
    !isPending &&
    !isSold &&
    userCharServers.includes(listing.server)
  )

  // ── Actions ──────────────────────────────────────────────

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

  async function handleRejectOffer() {
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
        <h3 className={styles.title}>{listing.title}</h3>
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
              onClick={handleRejectOffer}
              disabled={actionLoading}
            >
              {t('market.rejectOffer')}
            </button>
          </div>
        </div>
      )}

      {/* Offer list (owner view) */}
      {isOwner && isSell && !isPending && !isSold && activeOffers.length > 0 && (
        <div className={styles.offerList}>
          {activeOffers
            .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
            .map(offer => (
              <div key={offer.id} className={styles.offerRow}>
                <span className={styles.offerProfile}>
                  {offer.profile?.username ?? '—'}
                </span>
                <span className={styles.offerPrice}>
                  {formatGold(offer.price)} {t('market.gold')}
                </span>
                {offer.comment && <span className={styles.offerComment}>{offer.comment}</span>}
                <button
                  className={styles.btnAcceptOffer}
                  onClick={() => handleSelectOffer(offer.id)}
                  disabled={actionLoading}
                >
                  ✓
                </button>
              </div>
            ))}
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

          {/* Report blocked */}
          {isBlocked && (
            <span className={styles.blockedMsg}>{t('market.blockedFromListing')}</span>
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
            <span className={styles.myOfferBadge}>
              {t('market.cancelOffer')} ({formatGold(myOffer.price)} {t('market.gold')})
            </span>
          )}

          {/* Non-owner: follow/unfollow */}
          {!isOwner && user && onToggleFollow && (
            <button
              className={`${styles.btnFollow} ${isFollowed ? styles.btnFollowActive : ''}`}
              onClick={() => onToggleFollow(listing.id)}
              title={isFollowed ? t('market.unfollow') : t('market.follow')}
            >
              {isFollowed ? '🔖' : '🔖'}
              <span>{isFollowed ? t('market.unfollow') : t('market.follow')}</span>
            </button>
          )}

          {/* Seller: report button (only when confirmation_pending) */}
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
      {showOfferModal && (
        <OfferModal
          listing={listing}
          onClose={() => setShowOfferModal(false)}
          onSuccess={() => { setShowOfferModal(false); onRefresh?.() }}
        />
      )}

      {showReportModal && listing.acceptedOfferId && (
        <ReportModal
          listing={listing}
          offerId={listing.acceptedOfferId}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => { setShowReportModal(false); onRefresh?.() }}
        />
      )}
    </div>
  )
}
