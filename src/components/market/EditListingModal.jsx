// ============================================================
// EditListingModal — pre-filled form to edit an existing listing.
// Owner can update: title, description, tags, images, prices.
// Type and server cannot be changed after creation.
// ============================================================
import { useState } from 'react'
import { useLang } from '@/i18n'
import { MARKET_TAGS, parseGold, MAX_GOLD, LISTING_TYPES } from '@/lib/market'
import { fmtThousands } from '@/lib/utils'
import { updateListing } from '@/hooks/useMarket'
import styles from './CreateListingModal.module.css'

export default function EditListingModal({ listing, onClose, onSuccess }) {
  const { t } = useLang()

  const isSell = listing.type === LISTING_TYPES.SELL

  const [title,       setTitle]       = useState(listing.title ?? '')
  const [description, setDescription] = useState(listing.description ?? '')
  const [tags,        setTags]        = useState(listing.tags ?? [])
  const [imageUrls,   setImageUrls]   = useState(
    listing.imageUrls?.length ? listing.imageUrls : ['']
  )
  const [basePrice,   setBasePrice]   = useState(
    listing.basePrice != null ? fmtThousands(listing.basePrice) : ''
  )
  const [buyoutPrice, setBuyoutPrice] = useState(
    listing.buyoutPrice != null ? fmtThousands(listing.buyoutPrice) : ''
  )
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  function toggleTag(slug) {
    setTags(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  function updateImage(i, val) {
    setImageUrls(prev => prev.map((u, idx) => idx === i ? val : u))
  }

  function addImageField() {
    if (imageUrls.length < 5) setImageUrls(prev => [...prev, ''])
  }

  function removeImageField(i) {
    setImageUrls(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) { setError(t('market.formErrTitle')); return }

    const parsedBase   = basePrice   ? parseGold(basePrice)   : null
    const parsedBuyout = buyoutPrice ? parseGold(buyoutPrice) : null

    if (basePrice   && parsedBase   === null) { setError(t('market.formErrGold')); return }
    if (buyoutPrice && parsedBuyout === null) { setError(t('market.formErrGold')); return }
    if (parsedBase != null && parsedBuyout != null && parsedBuyout <= parsedBase) {
      setError(t('market.formErrBuyout')); return
    }

    setLoading(true)

    const { error: err } = await updateListing(listing.id, {
      title:        title.trim(),
      description:  description.trim() || null,
      tags,
      image_urls:   imageUrls.filter(u => u.trim()),
      base_price:   isSell ? parsedBase   : null,
      buyout_price: isSell ? parsedBuyout : null,
    })

    setLoading(false)
    if (err) { setError(err.message); return }
    onSuccess?.()
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        <h2 className={styles.title}>{t('market.editListingTitle')}</h2>

        <form className={styles.form} onSubmit={handleSubmit}>

          {/* Title */}
          <label className={styles.label}>
            {t('market.formTitle')} *
            <input
              className={styles.input}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('market.formTitlePlaceholder')}
              maxLength={120}
              required
            />
          </label>

          {/* Description */}
          <label className={styles.label}>
            {t('market.formDesc')}
            <textarea
              className={styles.textarea}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('market.formDescPlaceholder')}
              rows={3}
              maxLength={1000}
            />
          </label>

          {/* Tags */}
          <div className={styles.label}>
            {t('market.formTags')}
            <div className={styles.tagGrid}>
              {MARKET_TAGS.map(tag => (
                <button
                  key={tag.slug}
                  type="button"
                  className={`${styles.tagBtn} ${tags.includes(tag.slug) ? styles.tagActive : ''}`}
                  onClick={() => toggleTag(tag.slug)}
                >
                  {tag.icon} {t(`market.tags.${tag.slug}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Prices (sell only) */}
          {isSell && (
            <div className={styles.priceRow}>
              <label className={styles.label}>
                {t('market.formBasePrice')} <span className={styles.optional}>({t('market.formOptional')})</span>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="numeric"
                  value={basePrice}
                  onChange={e => setBasePrice(fmtThousands(e.target.value))}
                  placeholder="0"
                />
              </label>
              <label className={styles.label}>
                {t('market.formBuyoutPrice')} <span className={styles.optional}>({t('market.formOptional')})</span>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="numeric"
                  value={buyoutPrice}
                  onChange={e => setBuyoutPrice(fmtThousands(e.target.value))}
                  placeholder="0"
                />
              </label>
            </div>
          )}

          {/* Images */}
          <div className={styles.label}>
            {t('market.formImages')}
            <div className={styles.imageFields}>
              {imageUrls.map((url, i) => (
                <div key={i} className={styles.imageFieldGroup}>
                  <div className={styles.imageRow}>
                    <input
                      className={styles.input}
                      type="url"
                      value={url}
                      onChange={e => updateImage(i, e.target.value)}
                      placeholder={t('market.formImagesPlaceholder')}
                    />
                    {imageUrls.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeImg}
                        onClick={() => removeImageField(i)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {url.trim() && (
                    <img
                      src={url}
                      alt=""
                      className={styles.imagePreview}
                      onError={e => { e.target.style.display = 'none' }}
                      onLoad={e => { e.target.style.display = 'block' }}
                    />
                  )}
                </div>
              ))}
              {imageUrls.length < 5 && (
                <button type="button" className={styles.addImgBtn} onClick={addImageField}>
                  {t('market.formAddImage')}
                </button>
              )}
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.btnRow}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              {t('market.formCancel')}
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? '…' : t('market.editSave')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
