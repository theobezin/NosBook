// ============================================================
// OfferModal — submit a bid (sell listing) or response (buy listing)
// Sell: character (required), discord (optional), price > best offer, comment
// Buy:  character (required), discord (optional), screenshot URL, comment
// ============================================================
import { useState, useEffect, useMemo } from 'react'
import { useLang } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { useCharacters } from '@/hooks/useCharacters'
import { parseGold, formatGold, MAX_GOLD, bestOffer } from '@/lib/market'
import { createOffer, triggerConfirmation } from '@/hooks/useMarket'
import styles from './OfferModal.module.css'

export default function OfferModal({ listing, onClose, onSuccess, userProfile, minPrice = null }) {
  const { t } = useLang()
  const { user } = useAuth()
  const { characters } = useCharacters()

  const isSell = listing.type === 'sell'

  // Characters on the listing's server
  const serverChars = useMemo(
    () => characters.filter(c => c.server === listing.server),
    [characters, listing.server]
  )

  // Current best offer (client-side — used for minimum bid validation)
  const currentBest = useMemo(() => bestOffer(listing.offers ?? []), [listing.offers])

  const [characterName, setCharacterName] = useState('')
  const [discordHandle, setDiscordHandle] = useState(userProfile?.discord_handle ?? '')
  const [price,         setPrice]         = useState('')
  const [imageUrl,      setImageUrl]      = useState('')
  const [comment,       setComment]       = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)

  // Pre-select first character on this server once loaded
  useEffect(() => {
    if (!characterName && serverChars.length > 0) {
      setCharacterName(serverChars[0].name)
    }
  }, [serverChars]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!characterName.trim()) {
      setError(t('market.offerErrCharName'))
      return
    }

    if (isSell) {
      const parsed = parseGold(price)
      if (parsed === null || parsed <= 0) {
        setError(t('market.offerErrPrice'))
        return
      }
      // Must strictly exceed previous rejected offer (if any)
      if (minPrice != null && parsed <= minPrice) {
        setError(t('market.offerErrMustExceed', { best: formatGold(minPrice) }))
        return
      }
      // Must strictly exceed current best offer
      if (currentBest != null && parsed <= currentBest.price) {
        setError(t('market.offerErrMustExceed', { best: formatGold(currentBest.price) }))
        return
      }
    }

    setLoading(true)
    const parsedPrice = isSell ? parseGold(price) : null

    const { data, error: err } = await createOffer({
      listingId:     listing.id,
      profileId:     user.id,
      price:         parsedPrice,
      comment:       comment || null,
      imageUrl:      !isSell ? (imageUrl.trim() || null) : null,
      characterName: characterName.trim(),
      discordHandle: discordHandle.trim() || null,
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
    if (!characterName.trim()) { setError(t('market.offerErrCharName')); return }

    setLoading(true)
    setError(null)

    const { data, error: err } = await createOffer({
      listingId:     listing.id,
      profileId:     user.id,
      price:         listing.buyoutPrice,
      comment:       comment || null,
      characterName: characterName.trim(),
      discordHandle: discordHandle.trim() || null,
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

        {/* Character + contact — always first */}
        <div className={styles.contactRow}>
          <label className={styles.label}>
            <span className={styles.labelText}>{t('market.offerCharName')}</span>
            {serverChars.length > 1 ? (
              <select
                className={styles.input}
                value={characterName}
                onChange={e => setCharacterName(e.target.value)}
                required
              >
                <option value="">{t('market.offerCharNameSelect')}</option>
                {serverChars.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            ) : (
              <input
                className={styles.input}
                type="text"
                value={characterName}
                onChange={e => setCharacterName(e.target.value)}
                placeholder={t('market.offerCharNamePlaceholder')}
                required
              />
            )}
          </label>

          <label className={styles.label}>
            <span className={styles.labelText}>
              {t('market.offerDiscord')}
              <span className={styles.optional}> ({t('market.formOptional')})</span>
            </span>
            <input
              className={styles.input}
              type="text"
              value={discordHandle}
              onChange={e => setDiscordHandle(e.target.value)}
              placeholder="pseudo#0000"
            />
          </label>
        </div>

        {/* Buyout button (sell only) */}
        {isSell && listing.buyoutPrice != null && (
          <button
            className={styles.buyoutBtn}
            onClick={handleBuyout}
            disabled={loading}
          >
            {t('market.offerBuyout')} — {formatGold(listing.buyoutPrice)} {t('market.gold')}
          </button>
        )}

        {/* Rejected offer warning (re-bid flow) */}
        {isSell && minPrice != null && (
          <p className={styles.rejectedWarning}>
            {t('market.offerWasRejected')} {t('market.offerErrMustExceed', { best: formatGold(minPrice) })}
          </p>
        )}

        {/* Current best offer info (sell only) */}
        {isSell && currentBest != null && (
          <p className={styles.bestOfferInfo}>
            {t('market.offerCurrentBest')} : <strong>{formatGold(currentBest.price)} {t('market.gold')}</strong>
          </p>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Sell: price field */}
          {isSell && (
            <label className={styles.label}>
              <span className={styles.labelText}>{t('market.offerPrice')}</span>
              <input
                className={styles.input}
                type="number"
                min={1}
                max={MAX_GOLD}
                value={price}
                onChange={e => setPrice(e.target.value)}
                required
                placeholder={currentBest ? String(currentBest.price + 1) : '1'}
              />
            </label>
          )}

          {/* Buy: screenshot URL */}
          {!isSell && (
            <label className={styles.label}>
              <span className={styles.labelText}>
                {t('market.offerScreenshot')}
                <span className={styles.optional}> ({t('market.formOptional')})</span>
              </span>
              <input
                className={styles.input}
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://imgur.com/…"
              />
            </label>
          )}

          {/* Comment */}
          <label className={styles.label}>
            <span className={styles.labelText}>
              {t('market.offerComment')}
              <span className={styles.optional}> ({t('market.formOptional')})</span>
            </span>
            <textarea
              className={styles.textarea}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={t('market.offerCommentPlaceholder')}
              rows={2}
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.btnRow}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              {t('market.offerCancel')}
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? '…' : isSell ? t('market.offerBid') : t('market.offerSubmit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
