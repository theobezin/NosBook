// ============================================================
// ReportModal — seller reports a buyer who didn't honour the trade
// ============================================================
import { useState } from 'react'
import { useLang } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { createReport } from '@/hooks/useMarket'
import styles from './ReportModal.module.css'

export default function ReportModal({ listing, offerId, onClose, onSuccess }) {
  const { t } = useLang()
  const { user } = useAuth()

  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [success, setSuccess] = useState(false)

  // Determine the reported profile from the accepted offer
  // The listing object may not carry full offer details; we use acceptedOfferId.
  // The reported profile id is fetched server-side from the offer — here we pass
  // offerId and let the DB/hook handle the lookup via the offer row.
  // Since we don't have the buyer's profile_id directly in the card,
  // we need to find it from listing.offers if available.
  const acceptedOffer = (listing.offers ?? []).find(o => o.id === offerId)
  const reportedProfileId = acceptedOffer?.profileId ?? acceptedOffer?.profile_id

  async function handleSubmit(e) {
    e.preventDefault()
    if (!reason.trim()) return
    if (!reportedProfileId) { setError('Cannot identify buyer.'); return }

    setLoading(true)
    setError(null)

    const { error: err } = await createReport({
      listingId:          listing.id,
      offerId,
      reportedBy:         user.id,
      reportedProfileId,
      reason:             reason.trim(),
    })

    setLoading(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
    setTimeout(() => { onSuccess?.() }, 1500)
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        {success ? (
          <div className={styles.successBox}>
            <span className={styles.successIcon}>✅</span>
            <p>{t('market.reportSuccess')}</p>
          </div>
        ) : (
          <>
            <h2 className={styles.title}>{t('market.reportTitle')}</h2>
            <p className={styles.listingTitle}>{listing.title}</p>

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.label}>
                {t('market.reportReason')}
                <textarea
                  className={styles.textarea}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={t('market.reportReasonPlaceholder')}
                  rows={4}
                  required
                />
              </label>

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.btnRow}>
                <button type="button" className={styles.btnCancel} onClick={onClose}>
                  {t('market.reportCancel')}
                </button>
                <button type="submit" className={styles.btnSubmit} disabled={loading || !reason.trim()}>
                  {loading ? '…' : t('market.reportSubmit')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
