// ============================================================
// CreateListingModal — form to create a new sell or buy listing
// ============================================================
import { useState } from 'react'
import { useLang } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { MARKET_TAGS, parseGold, MAX_GOLD, LISTING_TYPES } from '@/lib/market'
import { createListing, isBanned, isMuted } from '@/hooks/useMarket'
import { supabase } from '@/lib/supabase'
import styles from './CreateListingModal.module.css'

const MAX_ACTIVE_LISTINGS = 20

export default function CreateListingModal({ type = LISTING_TYPES.SELL, userServer, userProfile, onClose, onSuccess }) {
  const { t }  = useLang()
  const { user } = useAuth()

  const isSell = type === LISTING_TYPES.SELL

  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [tags,        setTags]        = useState([])
  const [imageUrls,   setImageUrls]   = useState([''])
  const [basePrice,   setBasePrice]   = useState('')
  const [buyoutPrice, setBuyoutPrice] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)

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

    // Moderation guards
    if (isBanned(userProfile))  { setError(t('market.bannedCannotList')); return }
    if (isMuted(userProfile))   { setError(t('market.mutedCannotList'));  return }

    if (!title.trim()) { setError(t('market.formErrTitle')); return }

    // Active listings limit
    const { count } = await supabase
      .from('market_listings')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('status', 'active')
    if (count >= MAX_ACTIVE_LISTINGS) {
      setError(t('market.formErrLimit'))
      return
    }

    const parsedBase   = basePrice   ? parseGold(basePrice)   : null
    const parsedBuyout = buyoutPrice ? parseGold(buyoutPrice) : null

    if (basePrice   && parsedBase   === null) { setError(t('market.formErrGold')); return }
    if (buyoutPrice && parsedBuyout === null) { setError(t('market.formErrGold')); return }
    if (parsedBase != null && parsedBuyout != null && parsedBuyout <= parsedBase) {
      setError(t('market.formErrBuyout')); return
    }

    setLoading(true)

    const { error: err } = await createListing({
      profileId:   user.id,
      server:      userServer,
      type,
      title:       title.trim(),
      description: description.trim() || null,
      tags,
      imageUrls:   imageUrls.filter(u => u.trim()),
      basePrice:   isSell ? parsedBase   : null,
      buyoutPrice: isSell ? parsedBuyout : null,
    })

    setLoading(false)
    if (err) { setError(err.message); return }
    onSuccess?.()
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        <h2 className={styles.title}>
          {isSell ? t('market.createSell') : t('market.createBuy')}
        </h2>

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
                  type="number"
                  min={0}
                  max={MAX_GOLD}
                  value={basePrice}
                  onChange={e => setBasePrice(e.target.value)}
                  placeholder="0"
                />
              </label>
              <label className={styles.label}>
                {t('market.formBuyoutPrice')} <span className={styles.optional}>({t('market.formOptional')})</span>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={MAX_GOLD}
                  value={buyoutPrice}
                  onChange={e => setBuyoutPrice(e.target.value)}
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
              {loading ? '…' : t('market.formSubmit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
