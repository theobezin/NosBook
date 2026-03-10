// ============================================================
// AdminMarketPage — market reports dashboard for admins
// Shows pending/validated/rejected reports with action buttons.
// Accessible only to users with is_admin = true.
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { useLang } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { supabase, hasSupabase } from '@/lib/supabase'
import { fetchReports, validateReport, rejectReport } from '@/hooks/useMarket'
import { REPORT_STATUS } from '@/lib/market'
import { formatGold } from '@/lib/market'
import Spinner from '@/components/ui/Spinner'
import styles from './AdminMarketPage.module.css'

// ── Report row ─────────────────────────────────────────────
function ReportRow({ report, onRefresh, t }) {
  const [note,    setNote]    = useState(report.admin_note ?? '')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const isPending = report.status === REPORT_STATUS.PENDING

  async function handleValidate() {
    setLoading(true); setError(null)
    const { error: err } = await validateReport(report.id, note)
    setLoading(false)
    if (err) { setError(err.message); return }
    onRefresh()
  }

  async function handleReject() {
    setLoading(true); setError(null)
    const { error: err } = await rejectReport(report.id, note)
    setLoading(false)
    if (err) { setError(err.message); return }
    onRefresh()
  }

  const statusColor = {
    [REPORT_STATUS.PENDING]:   '#e6b430',
    [REPORT_STATUS.VALIDATED]: '#22c55e',
    [REPORT_STATUS.REJECTED]:  '#6b7280',
  }

  return (
    <div className={styles.reportRow}>
      <div className={styles.reportHeader}>
        <span className={styles.statusBadge} style={{ color: statusColor[report.status] }}>
          ● {report.status.toUpperCase()}
        </span>
        <span className={styles.reportDate}>
          {new Date(report.created_at).toLocaleDateString()}
        </span>
      </div>

      <div className={styles.reportBody}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Listing</span>
          <span className={styles.fieldValue}>
            {report.market_listings?.title ?? '—'}
            {report.market_listings?.server && (
              <span className={styles.serverTag}> [{report.market_listings.server}]</span>
            )}
          </span>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Signalé par</span>
          <span className={styles.fieldValue}>{report.reported_by_profile?.username ?? '—'}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Acheteur signalé</span>
          <span className={`${styles.fieldValue} ${styles.reported}`}>
            {report.reported_profile?.username ?? '—'}
            <span className={styles.reportCount}>
              ⚠️ {report.reported_profile?.trades_reported ?? 0} signalement(s)
            </span>
          </span>
        </div>

        {report.market_offers && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Offre concernée</span>
            <span className={styles.fieldValue}>
              {report.market_offers.price != null
                ? `${formatGold(report.market_offers.price)} ${t('market.gold')}`
                : '—'}
              {report.market_offers.comment && (
                <span className={styles.offerComment}> — {report.market_offers.comment}</span>
              )}
            </span>
          </div>
        )}

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Raison</span>
          <span className={styles.fieldValue}>{report.reason}</span>
        </div>

        {/* Admin note + actions */}
        {isPending && (
          <>
            <label className={styles.noteLabel}>
              {t('market.adminNote')}
              <textarea
                className={styles.noteInput}
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder="Note interne (optionnel)…"
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.reportActions}>
              <button
                className={styles.btnValidate}
                onClick={handleValidate}
                disabled={loading}
              >
                {loading ? '…' : t('market.adminValidate')}
              </button>
              <button
                className={styles.btnRejectAction}
                onClick={handleReject}
                disabled={loading}
              >
                {loading ? '…' : t('market.adminReject')}
              </button>
            </div>
          </>
        )}

        {!isPending && report.admin_note && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Note admin</span>
            <span className={styles.fieldValue}>{report.admin_note}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── AdminMarketPage ────────────────────────────────────────
export default function AdminMarketPage() {
  const { t } = useLang()
  const { user } = useAuth()

  const [isAdmin,  setIsAdmin]  = useState(false)
  const [checking, setChecking] = useState(true)
  const [tab,      setTab]      = useState('pending')
  const [reports,  setReports]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  // Check admin status
  useEffect(() => {
    if (!user || !hasSupabase) { setChecking(false); return }
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setIsAdmin(data?.is_admin === true)
        setChecking(false)
      })
  }, [user?.id])

  const loadReports = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await fetchReports(tab)
    setLoading(false)
    if (err) { setError(err.message); return }
    setReports(data)
  }, [isAdmin, tab])

  useEffect(() => { loadReports() }, [loadReports])

  if (checking) return <div className={styles.page}><Spinner size="md" /></div>

  if (!user || !isAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.gateBox}>
          <span className={styles.gateIcon}>🔒</span>
          <p>Accès réservé aux administrateurs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('market.adminReports')}</h1>

      {/* Status tabs */}
      <div className={styles.tabs}>
        {[
          { key: 'pending',   label: t('market.adminPending')   },
          { key: 'validated', label: t('market.adminValidated') },
          { key: 'rejected',  label: t('market.adminRejected')  },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
            {key === 'pending' && reports.filter(r => r.status === 'pending').length > 0 && tab !== 'pending' && (
              <span className={styles.badge}>
                {reports.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && <div className={styles.centered}><Spinner size="md" /></div>}
      {error   && <p className={styles.errorMsg}>{error}</p>}

      {!loading && !error && (
        reports.length === 0
          ? <p className={styles.empty}>{t('market.adminNoReports')}</p>
          : (
            <div className={styles.list}>
              {reports.map(r => (
                <ReportRow key={r.id} report={r} onRefresh={loadReports} t={t} />
              ))}
            </div>
          )
      )}
    </div>
  )
}
