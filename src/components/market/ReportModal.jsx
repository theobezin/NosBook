// ============================================================
// ReportModal — generic report modal, two modes:
//   'nonpayer' (default) — seller reports a buyer who didn't honour the trade
//   'spam'               — listing owner reports a spam/abusive offer
// ============================================================
import { useState } from 'react'
import { useLang } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { createReport } from '@/hooks/useMarket'
import styles from './ReportModal.module.css'

export default function ReportModal({
  listing,
  offerId,
  // Directly pass the profile ID when known (spam mode) to avoid relying on listing.offers content
  reportedProfileId: reportedProfileIdProp,
  mode = 'nonpayer',
  onClose,
  onSuccess,
}) {
  const { t } = useLang()
  const { user } = useAuth()

  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [success, setSuccess] = useState(false)

  // Resolve the reported profile ID:
  // Priority: explicit prop → search listing.offers by offerId
  const resolvedReportedProfileId = reportedProfileIdProp ?? (() => {
    const offer = (listing.offers ?? []).find(o => o.id === offerId)
    return offer?.profileId ?? offer?.profile_id
  })()

  const titleKey = mode === 'spam' ? 'market.reportOfferTitle' : 'market.reportTitle'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!reason.trim()) return
    if (!resolvedReportedProfileId) { setError('Cannot identify the reported user.'); return }

    setLoading(true)
    setError(null)

    const { error: err } = await createReport({
      listingId:         listing.id,
      offerId,
      reportedBy:        user.id,
      reportedProfileId: resolvedReportedProfileId,
      reason:            reason.trim(),
    })

    setLoading(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
    setTimeout(() => { onSuccess?.() }, 1500)
  }

  return (
    <div className={styles.overlay} onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        {success ? (
          <div className={styles.successBox}>
            <span className={styles.successIcon}>✅</span>
            <p>{t('market.reportSuccess')}</p>
          </div>
        ) : (
          <>
            <h2 className={styles.title}>{t(titleKey)}</h2>
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
