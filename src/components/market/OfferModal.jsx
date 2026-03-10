// ============================================================
// OfferModal — submit a bid (sell listing) or response (buy listing)
// ============================================================
import { useState } from 'react'
import { useLang } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { parseGold, formatGold, MAX_GOLD } from '@/lib/market'
import { createOffer, triggerConfirmation } from '@/hooks/useMarket'
import styles from './OfferModal.module.css'

export default function OfferModal({ listing, onClose, onSuccess }) {
  const { t } = useLang()
  const { user } = useAuth()

  const isSell = listing.type === 'sell'

  const [price,    setPrice]    = useState('')
  const [comment,  setComment]  = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    // Validate price for sell bids
    if (isSell) {
      const parsed = parseGold(price)
      if (parsed === null) { setError(t('market.offerErrPrice')); return }
    }

    setLoading(true)
    const parsedPrice = isSell ? parseGold(price) : (price ? parseGold(price) : null)

    const { data, error: err } = await createOffer({
      listingId:  listing.id,
      profileId:  user.id,
      price:      parsedPrice,
      comment:    comment || null,
      imageUrl:   imageUrl || null,
    })

    if (err) { setError(err.message); setLoading(false); return }

    // Auto-trigger confirmation if buyout price is reached
    if (isSell && listing.buyoutPrice != null && parsedPrice >= listing.buyoutPrice) {
      await triggerConfirmation(listing.id, data.id)
    }

    setLoading(false)
    onSuccess?.()
  }

  async function handleBuyout() {
    if (!listing.buyoutPrice) return
    setLoading(true)
    setError(null)

    const { data, error: err } = await createOffer({
      listingId: listing.id,
      profileId: user.id,
      price:     listing.buyoutPrice,
      comment:   comment || null,
      imageUrl:  null,
    })

    if (err) { setError(err.message); setLoading(false); return }

    await triggerConfirmation(listing.id, data.id)
    setLoading(false)
    onSuccess?.()
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
        <h2 className={styles.title}>
          {isSell ? t('market.makeOffer') : t('market.respond')}
        </h2>
        <p className={styles.listingTitle}>{listing.title}</p>

        {isSell && listing.buyoutPrice != null && (
          <button
            className={styles.buyoutBtn}
            onClick={handleBuyout}
            disabled={loading}
          >
            {t('market.offerBuyout')} — {formatGold(listing.buyoutPrice)} {t('market.gold')}
          </button>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          {isSell && (
            <label className={styles.label}>
              {t('market.offerPrice')}
              <input
                className={styles.input}
                type="number"
                min={0}
                max={MAX_GOLD}
                value={price}
                onChange={e => setPrice(e.target.value)}
                required
                placeholder="0"
              />
            </label>
          )}

          {!isSell && (
            <label className={styles.label}>
              {t('market.offerPrice')} <span className={styles.optional}>({t('market.formOptional')})</span>
              <input
                className={styles.input}
                type="number"
                min={0}
                max={MAX_GOLD}
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0"
              />
            </label>
          )}

          <label className={styles.label}>
            {t('market.offerComment')}
            <textarea
              className={styles.textarea}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={t('market.offerComment')}
              rows={3}
            />
          </label>

          <label className={styles.label}>
            {t('market.offerImage')}
            <input
              className={styles.input}
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder={t('market.formImagesPlaceholder')}
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.btnRow}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              {t('market.offerCancel')}
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? '…' : t('market.offerSubmit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
