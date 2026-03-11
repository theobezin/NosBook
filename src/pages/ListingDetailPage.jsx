// ============================================================
// ListingDetailPage — full detail view for a market listing
// Route: /market/:id
// Shows: all listing info, all offers with full details,
// action buttons based on context (owner / buyer / visitor).
// ============================================================
import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useLang } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useCharacters } from '@/hooks/useCharacters'
import { useMarketListing, cancelOffer, rejectOffer, triggerConfirmation, confirmSale, rejectConfirmation, archiveListing, isBanned, isMuted } from '@/hooks/useMarket'
import { MARKET_TAGS, formatGold, bestOffer, LISTING_STATUS, OFFER_STATUS } from '@/lib/market'
import OfferModal        from '@/components/market/OfferModal'
import ReportModal      from '@/components/market/ReportModal'
import EditListingModal from '@/components/market/EditListingModal'
import Spinner          from '@/components/ui/Spinner'
import ConfirmModal     from '@/components/ui/ConfirmModal'
import styles from './ListingDetailPage.module.css'

// ── Helpers ────────────────────────────────────────────────

function daysLeft(lastActivityAt) {
  const ms = 30 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(lastActivityAt).getTime())
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

const SERVER_COLOR = { undercity: '#6a5acd', dragonveil: '#20b2aa' }
const SERVER_LABEL = { undercity: 'Undercity', dragonveil: 'Dragonveil' }

function TagPill({ slug, t }) {
  const tagDef = MARKET_TAGS.find(tg => tg.slug === slug)
  return (
    <span className={styles.tagPill}>
      {tagDef?.icon} {t(`market.tags.${slug}`)}
    </span>
  )
}

const OFFER_STATUS_KEY = {
  [OFFER_STATUS.ACTIVE]:    'market.offerActive',
  [OFFER_STATUS.CANCELLED]: 'market.offerCancelled',
  [OFFER_STATUS.ACCEPTED]:  'market.offerAccepted',
  [OFFER_STATUS.REJECTED]:  'market.offerRejected',
  [OFFER_STATUS.BLOCKED]:   'market.offerBlocked',
}

const OFFER_STATUS_STYLE = {
  [OFFER_STATUS.ACTIVE]:    styles.statusActive,
  [OFFER_STATUS.CANCELLED]: styles.statusCancelled,
  [OFFER_STATUS.ACCEPTED]:  styles.statusAccepted,
  [OFFER_STATUS.REJECTED]:  styles.statusRejected,
  [OFFER_STATUS.BLOCKED]:   styles.statusBlocked,
}

// ── OfferRow ───────────────────────────────────────────────

function OfferRow({ offer, isOwner, listing, onRefresh, t, user, isPending }) {
  const [loading,       setLoading]       = useState(false)
  const [spamReport,    setSpamReport]    = useState(false)
  const [confirmState,  setConfirmState]  = useState(null)

  // Offers are mapped through fromDBOffer → camelCase
  const offerId         = offer.id
  const offerProfileId  = offer.profileId
  const username        = offer.profile?.username ?? '—'
  const isMyOffer       = user?.id === offerProfileId
  const isActive        = offer.status === OFFER_STATUS.ACTIVE
  const isAccepted      = offer.status === OFFER_STATUS.ACCEPTED

  function handleCancel() {
    setConfirmState({
      message: t('market.cancelOfferConfirm'),
      onConfirm: async () => {
        setConfirmState(null)
        setLoading(true)
        await cancelOffer(offerId)
        setLoading(false)
        onRefresh()
      },
    })
  }

  async function handleAccept() {
    setLoading(true)
    await triggerConfirmation(listing.id, offerId)
    setLoading(false)
    onRefresh()
  }

  function handleReject() {
    setConfirmState({
      message: t('market.rejectOfferConfirm'),
      danger: true,
      onConfirm: async () => {
        setConfirmState(null)
        setLoading(true)
        const { error } = await rejectOffer(offerId)
        setLoading(false)
        if (error) { console.error('rejectOffer error:', error); return }
        onRefresh()
      },
    })
  }

  const isRejected = offer.status === OFFER_STATUS.REJECTED

  return (
    <div className={`${styles.offerRow} ${isAccepted ? styles.offerAccepted : ''} ${isRejected ? styles.offerRejectedRow : ''} ${offer.status === OFFER_STATUS.BLOCKED ? styles.offerBlockedRow : ''}`}>

      {/* Offer header: username + status */}
      <div className={styles.offerHeader}>
        <span className={styles.offerUser}>{username}</span>
        <span className={`${styles.offerStatusBadge} ${OFFER_STATUS_STYLE[offer.status] ?? ''}`}>
          {t(OFFER_STATUS_KEY[offer.status] ?? 'market.offerActive')}
        </span>
        {offer.price != null && (
          <span className={`${styles.offerPrice} ${isAccepted ? styles.offerPriceAccepted : ''}`}>
            {formatGold(offer.price)} {t('market.gold')}
          </span>
        )}
      </div>

      {/* Comment */}
      {offer.comment && (
        <p className={styles.offerComment}>{offer.comment}</p>
      )}

      {/* Character + discord */}
      {(offer.characterName || offer.discordHandle) && (
        <div className={styles.offerIdentity}>
          {offer.characterName && <span className={styles.offerCharName}>{offer.characterName}</span>}
          {offer.discordHandle && <span className={styles.offerDiscord}>💬 {offer.discordHandle}</span>}
        </div>
      )}

      {/* Screenshot / image */}
      {offer.imageUrl && (
        <a href={offer.imageUrl} target="_blank" rel="noopener noreferrer" className={styles.offerImageLink}>
          <img
            src={offer.imageUrl}
            alt="screenshot"
            className={styles.offerImage}
            onError={e => { e.target.style.display = 'none' }}
          />
        </a>
      )}

      {/* Actions */}
      <div className={styles.offerActions}>
        {/* Owner: accept offer */}
        {isOwner && isActive && !isPending && (
          <button className={styles.btnAccept} onClick={handleAccept} disabled={loading}>
            ✓ {t('market.confirmSale')}
          </button>
        )}

        {/* Owner: reject offer */}
        {isOwner && isActive && !isPending && (
          <button className={styles.btnRejectOffer} onClick={handleReject} disabled={loading}>
            ✕ {t('market.rejectOffer')}
          </button>
        )}

        {/* Owner: spam report */}
        {isOwner && !isMyOffer && isActive && (
          <button
            className={styles.btnReportOffer}
            onClick={() => setSpamReport(true)}
            title={t('market.reportOfferTitle')}
          >
            ⚠️ {t('market.reportOfferTitle')}
          </button>
        )}

        {/* Buyer: cancel own active offer */}
        {isMyOffer && isActive && (
          <button className={styles.btnCancel} onClick={handleCancel} disabled={loading}>
            {t('market.cancelMyOffer')}
          </button>
        )}
      </div>

      {spamReport && (
        <ReportModal
          listing={listing}
          offerId={offerId}
          reportedProfileId={offerProfileId}
          mode="spam"
          onClose={() => setSpamReport(false)}
          onSuccess={() => { setSpamReport(false); onRefresh() }}
        />
      )}

      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          danger={confirmState.danger}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  )
}

// ── ListingDetailPage ──────────────────────────────────────

export default function ListingDetailPage() {
  const { id }  = useParams()
  const { t }   = useLang()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const { listing, loading, error, refetch } = useMarketListing(id)
  const { profile }    = useProfile(user?.id)
  const { characters } = useCharacters()

  const [showOfferModal,  setShowOfferModal]  = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showEditModal,   setShowEditModal]   = useState(false)
  const [actionLoading,   setActionLoading]   = useState(false)
  const [confirmState,    setConfirmState]    = useState(null)
  const [lightboxSrc,     setLightboxSrc]     = useState(null)

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.centered}><Spinner size="md" /></div>
    </div>
  )

  if (error || !listing) return (
    <div className={styles.page}>
      <p className={styles.errorMsg}>{error ?? t('market.noListings')}</p>
      <Link to="/market" className={styles.backLink}>{t('market.backToMarket')}</Link>
    </div>
  )

  const isSell    = listing.type === 'sell'
  const isOwner   = user?.id === listing.profileId
  const isBlocked = listing.blockedProfiles.includes(user?.id)
  const isPending = listing.confirmationPending
  const isSold    = listing.status === LISTING_STATUS.SOLD
  const isArchived = listing.status === LISTING_STATUS.ARCHIVED

  // All offers (the detail view has full data via useMarketListing)
  const allOffers    = listing.offers ?? []
  const activeOffers = allOffers.filter(o => o.status === OFFER_STATUS.ACTIVE)
  const top          = bestOffer(allOffers)

  // Viewer's eligibility to make an offer
  const userCharServers = (() => {
    const fromChars = characters.map(c => c.server).filter(Boolean)
    if (fromChars.length) return [...new Set(fromChars)]
    if (profile?.server) return [profile.server]
    return []
  })()

  const viewerBanned     = isBanned(profile)
  const viewerMuted      = isMuted(profile)
  const viewerRestricted = viewerBanned || viewerMuted

  const myActiveOffer = allOffers.find(
    o => o.profileId === user?.id && o.status === OFFER_STATUS.ACTIVE
  )

  const myRejectedOffer = allOffers.find(
    o => o.profileId === user?.id && o.status === OFFER_STATUS.REJECTED
  )

  const canOffer = (
    isAuthenticated &&
    !isOwner &&
    !isBlocked &&
    !isPending &&
    !isSold &&
    !isArchived &&
    !viewerRestricted &&
    userCharServers.includes(listing.server)
  )

  // Sort offers: accepted first, then active (by price desc), then others
  const sortedOffers = [...allOffers].sort((a, b) => {
    const rank = { accepted: 0, active: 1, rejected: 2, cancelled: 3, blocked: 4 }
    const ra = rank[a.status] ?? 3
    const rb = rank[b.status] ?? 3
    if (ra !== rb) return ra - rb
    return (b.price ?? 0) - (a.price ?? 0)
  })

  async function handleConfirmSale() {
    setActionLoading(true)
    await confirmSale(listing.id)
    setActionLoading(false)
    refetch()
  }

  async function handleRejectOffer() {
    setActionLoading(true)
    await rejectConfirmation(listing.id)
    setActionLoading(false)
    refetch()
  }

  function handleArchive() {
    setConfirmState({
      message: t('market.archiveListing') + ' ?',
      danger: true,
      onConfirm: async () => {
        setConfirmState(null)
        setActionLoading(true)
        await archiveListing(listing.id)
        setActionLoading(false)
        navigate('/market')
      },
    })
  }

  const serverColor = SERVER_COLOR[listing.server] ?? '#6b7280'

  return (
    <div className={styles.page}>

      {/* Back link */}
      <Link to="/market" className={styles.backLink}>{t('market.backToMarket')}</Link>

      <div className={styles.layout}>

        {/* ── Left column: listing detail ── */}
        <div className={styles.main}>

          {/* Header badges */}
          <div className={styles.badges}>
            <span className={`${styles.typeBadge} ${isSell ? styles.typeSell : styles.typeBuy}`}>
              {isSell ? '🏷️ WTS' : '🔍 WTB'}
            </span>
            <span className={styles.serverBadge} style={{ '--server-color': serverColor }}>
              {SERVER_LABEL[listing.server]}
            </span>
            {isSold && <span className={styles.soldBadge}>{t('market.sold')}</span>}
            {isArchived && <span className={styles.archivedBadge}>{t('market.archived')}</span>}
            {isPending && <span className={styles.pendingBadge}>{t('market.pending')}</span>}
          </div>

          {/* Title */}
          <h1 className={styles.title}>{listing.title}</h1>

          {/* Description */}
          {listing.description && (
            <p className={styles.desc}>{listing.description}</p>
          )}

          {/* Tags */}
          {listing.tags.length > 0 && (
            <div className={styles.tags}>
              {listing.tags.map(slug => <TagPill key={slug} slug={slug} t={t} />)}
            </div>
          )}

          {/* Images */}
          {listing.imageUrls.length > 0 && (
            <div className={styles.images}>
              {listing.imageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className={styles.image}
                  onClick={() => setLightboxSrc(url)}
                  onError={e => { e.target.style.display = 'none' }}
                />
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
              {top && (
                <div className={styles.priceRow}>
                  <span className={styles.priceLabel}>{t('market.bestOffer')}</span>
                  <span className={`${styles.priceValue} ${styles.bestValue}`}>
                    {formatGold(top.price)} {t('market.gold')}
                  </span>
                </div>
              )}
              <div className={styles.offerCount}>
                {activeOffers.length} {t('market.offersCount')}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className={styles.meta}>
            <span className={styles.metaItem}>
              {t('market.postedDate')} {new Date(listing.createdAt).toLocaleDateString()}
            </span>
            {!isSold && !isArchived && (
              <span className={styles.metaItem}>
                ⏳ {daysLeft(listing.lastActivityAt)}{t('market.days')}
              </span>
            )}
          </div>
        </div>

        {/* ── Right column: seller + actions ── */}
        <div className={styles.sidebar}>

          {/* Seller info */}
          <div className={styles.sellerCard}>
            <p className={styles.sidebarTitle}>{t('market.postedBy')}</p>
            <p className={styles.sellerName}>{listing.profile?.username ?? '—'}</p>
            {listing.profile?.discord_handle && (
              <p className={styles.discord}>
                💬 {listing.profile.discord_handle}
              </p>
            )}
            <div className={styles.reputation}>
              <span className={styles.repItem}>✅ {listing.profile?.trades_completed ?? 0}</span>
              <span className={styles.repItem}>⚠️ {listing.profile?.trades_reported ?? 0}</span>
            </div>
          </div>

          {/* Confirmation pending (owner) */}
          {isPending && isOwner && (
            <div className={styles.pendingCard}>
              <p className={styles.pendingText}>{t('market.confirmPending')}</p>
              <button className={styles.btnConfirm} onClick={handleConfirmSale} disabled={actionLoading}>
                {t('market.confirmSale')}
              </button>
              <button className={styles.btnRejectOffer} onClick={handleRejectOffer} disabled={actionLoading}>
                {t('market.rejectOffer')}
              </button>
              <button
                className={styles.btnReportBuyer}
                onClick={() => setShowReportModal(true)}
              >
                {t('market.reportBuyer')}
              </button>
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            {/* Buyer: blocked */}
            {isBlocked && (
              <p className={styles.blockedMsg}>{t('market.blockedFromListing')}</p>
            )}

            {/* Buyer: muted/banned */}
            {!isOwner && !isBlocked && viewerRestricted && (
              <p className={styles.restrictedMsg}>
                {viewerBanned ? t('market.bannedCannotOffer') : t('market.mutedCannotOffer')}
              </p>
            )}

            {/* Buyer: offer was rejected — cannot re-bid */}
            {!isOwner && !isBlocked && !viewerRestricted && myRejectedOffer && (
              <p className={styles.restrictedMsg}>{t('market.offerWasRejected')}</p>
            )}

            {/* Buyer: make offer */}
            {canOffer && !myActiveOffer && (
              <button className={styles.btnOffer} onClick={() => setShowOfferModal(true)}>
                {isSell ? t('market.makeOffer') : t('market.respond')}
              </button>
            )}

            {/* Buyer: cancel active offer */}
            {myActiveOffer && (
              <button
                className={styles.btnCancelOffer}
                onClick={() => setConfirmState({
                  message: t('market.cancelOfferConfirm'),
                  onConfirm: async () => {
                    setConfirmState(null)
                    setActionLoading(true)
                    await cancelOffer(myActiveOffer.id)
                    setActionLoading(false)
                    refetch()
                  },
                })}
                disabled={actionLoading}
              >
                {t('market.cancelMyOffer')}
                {myActiveOffer.price != null && ` (${formatGold(myActiveOffer.price)} ${t('market.gold')})`}
              </button>
            )}

            {/* Owner: edit */}
            {isOwner && !isSold && !isArchived && !isPending && (
              <button className={styles.btnEdit} onClick={() => setShowEditModal(true)}>
                ✏️ {t('market.editListing')}
              </button>
            )}

            {/* Owner: archive */}
            {isOwner && !isSold && !isArchived && (
              <button className={styles.btnArchive} onClick={handleArchive} disabled={actionLoading}>
                {t('market.archiveListing')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Offers section ── */}
      <div className={styles.offersSection}>
        <h2 className={styles.offersTitle}>
          {isOwner ? t('market.allOffers') : t('market.myOffers')}
          <span className={styles.offersCount}>{sortedOffers.length}</span>
        </h2>

        {sortedOffers.length === 0 ? (
          <p className={styles.noOffers}>{t('market.noOffersYet')}</p>
        ) : (
          <div className={styles.offersList}>
            {sortedOffers.map(offer => (
              <OfferRow
                key={offer.id}
                offer={offer}
                isOwner={isOwner}
                listing={listing}
                onRefresh={refetch}
                t={t}
                user={user}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showOfferModal && (
        <OfferModal
          listing={listing}
          userProfile={profile}
          minPrice={myRejectedOffer?.price ?? null}
          onClose={() => setShowOfferModal(false)}
          onSuccess={() => { setShowOfferModal(false); refetch() }}
        />
      )}

      {showReportModal && listing.acceptedOfferId && (
        <ReportModal
          listing={listing}
          offerId={listing.acceptedOfferId}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => { setShowReportModal(false); refetch() }}
        />
      )}

      {showEditModal && (
        <EditListingModal
          listing={listing}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { setShowEditModal(false); refetch() }}
        />
      )}

      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          danger={confirmState.danger}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} className={styles.lightboxImg} alt="" />
        </div>
      )}
    </div>
  )
}
