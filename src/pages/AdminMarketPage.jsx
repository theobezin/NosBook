// ============================================================
// AdminMarketPage — admin dashboard for market management.
// Two sections:
//   • Reports  — review pending/validated/rejected reports
//   • Moderation — list of currently muted/banned users
// Accessible only to users with is_admin = true.
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { supabase, hasSupabase } from '@/lib/supabase'
import {
  fetchReports,
  validateReport,
  rejectReport,
  setModeration,
  fetchModeratedProfiles,
  isBanned,
  isMuted,
} from '@/hooks/useMarket'
import { REPORT_STATUS, formatGold } from '@/lib/market'
import Spinner from '@/components/ui/Spinner'
import styles from './AdminMarketPage.module.css'

// ── ModerationPanel (inside a report row) ──────────────────
function ModerationPanel({ reportedProfile, onRefresh, t }) {
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState(null)

  if (!reportedProfile) return null

  const banned = isBanned(reportedProfile)
  const muted  = isMuted(reportedProfile)

  async function apply(action, days = null) {
    setLoading(true)
    setMsg(null)
    const { error } = await setModeration(reportedProfile.id, action, days)
    setLoading(false)
    if (error) {
      setMsg({ type: 'err', text: t('market.adminSanctionError') })
    } else {
      setMsg({ type: 'ok', text: t('market.adminSanctionSuccess') })
      setTimeout(() => onRefresh(), 800)
    }
  }

  const mutedUntilStr = reportedProfile.muted_until
    ? new Date(reportedProfile.muted_until).toLocaleDateString()
    : null

  return (
    <div className={styles.moderationPanel}>
      <p className={styles.moderationTitle}>{t('market.adminModerationTitle')}</p>

      <div className={styles.moderationStatus}>
        {banned
          ? <span className={styles.statusBanned}>{t('market.adminStatusBanned')}</span>
          : muted
            ? <span className={styles.statusMuted}>{t('market.adminStatusMuted')} {mutedUntilStr}</span>
            : <span className={styles.statusClean}>{t('market.adminStatusClean')}</span>
        }
      </div>

      {msg && (
        <p className={msg.type === 'ok' ? styles.sanctionOk : styles.sanctionErr}>{msg.text}</p>
      )}

      <div className={styles.moderationActions}>
        {!banned && (
          <>
            <button className={styles.btnMute} onClick={() => apply('mute', 3)}  disabled={loading}>{t('market.adminMuteUser')} {t('market.adminMute3d')}</button>
            <button className={styles.btnMute} onClick={() => apply('mute', 7)}  disabled={loading}>{t('market.adminMuteUser')} {t('market.adminMute7d')}</button>
            <button className={styles.btnMute} onClick={() => apply('mute', 30)} disabled={loading}>{t('market.adminMuteUser')} {t('market.adminMute30d')}</button>
          </>
        )}
        {muted && !banned && (
          <button className={styles.btnUnmute} onClick={() => apply('unmute')} disabled={loading}>{t('market.adminUnmuteUser')}</button>
        )}
        {!banned
          ? <button className={styles.btnBan} onClick={() => apply('ban')} disabled={loading}>{t('market.adminBanUser')}</button>
          : <button className={styles.btnUnmute} onClick={() => apply('unban')} disabled={loading}>{t('market.adminUnbanUser')}</button>
        }
      </div>
    </div>
  )
}

// ── ReportRow ──────────────────────────────────────────────
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
          <span className={styles.fieldLabel}>{t('market.adminListing')}</span>
          <span className={styles.fieldValue}>
            <strong>{report.market_listings?.title ?? '—'}</strong>
            {report.market_listings?.server && (
              <span className={styles.serverTag}> [{report.market_listings.server}]</span>
            )}
            {report.listing_id && (
              <Link
                to={`/market/${report.listing_id}`}
                className={styles.listingLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('market.adminViewListing')}
              </Link>
            )}
          </span>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('market.adminReportedBy')}</span>
          <span className={styles.fieldValue}>{report.reported_by_profile?.username ?? '—'}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('market.adminReportedUser')}</span>
          <span className={`${styles.fieldValue} ${styles.reported}`}>
            <strong>{report.reported_profile?.username ?? '—'}</strong>
            <span className={styles.reportCount}>
              ⚠️ {report.reported_profile?.trades_reported ?? 0} signalement(s)
            </span>
          </span>
        </div>

        {report.market_offers && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{t('market.adminOfferConcerned')}</span>
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
          <span className={styles.fieldLabel}>{t('market.adminReason')}</span>
          <span className={styles.fieldValue}>{report.reason}</span>
        </div>

        <ModerationPanel
          reportedProfile={report.reported_profile}
          onRefresh={onRefresh}
          t={t}
        />

        {isPending && (
          <>
            <label className={styles.noteLabel}>
              {t('market.adminNote')}
              <textarea
                className={styles.noteInput}
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder={t('market.adminNoteInternal')}
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.reportActions}>
              <button className={styles.btnValidate} onClick={handleValidate} disabled={loading}>
                {loading ? '…' : t('market.adminValidate')}
              </button>
              <button className={styles.btnRejectAction} onClick={handleReject} disabled={loading}>
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

// ── ModerationRow ──────────────────────────────────────────
function ModerationRow({ profile, onRefresh, t }) {
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState(null)

  const banned = isBanned(profile)
  const muted  = isMuted(profile)

  async function apply(action) {
    setLoading(true)
    setMsg(null)
    const { error } = await setModeration(profile.id, action)
    setLoading(false)
    if (error) {
      setMsg({ type: 'err', text: t('market.adminSanctionError') })
    } else {
      setMsg({ type: 'ok', text: t('market.adminSanctionSuccess') })
      setTimeout(() => onRefresh(), 800)
    }
  }

  const mutedUntilStr = profile.muted_until
    ? new Date(profile.muted_until).toLocaleDateString()
    : null

  return (
    <div className={styles.modRow}>
      <div className={styles.modRowLeft}>
        <span className={styles.modUsername}>{profile.username}</span>
        <div className={styles.modStatus}>
          {banned
            ? <span className={styles.statusBanned}>{t('market.adminStatusBanned')}</span>
            : muted
              ? <span className={styles.statusMuted}>{t('market.adminStatusMuted')} {mutedUntilStr}</span>
              : null
          }
        </div>
        <span className={styles.modReports}>
          ⚠️ {profile.trades_reported ?? 0} signalement(s) · ✅ {profile.trades_completed ?? 0} échange(s)
        </span>
      </div>
      <div className={styles.modRowActions}>
        {msg && (
          <span className={msg.type === 'ok' ? styles.sanctionOk : styles.sanctionErr}>{msg.text}</span>
        )}
        {muted && !banned && (
          <button className={styles.btnUnmute} onClick={() => apply('unmute')} disabled={loading}>
            {t('market.adminUnmuteUser')}
          </button>
        )}
        {banned && (
          <button className={styles.btnUnmute} onClick={() => apply('unban')} disabled={loading}>
            {t('market.adminUnbanUser')}
          </button>
        )}
      </div>
    </div>
  )
}

// ── ModerationListPanel ────────────────────────────────────
function ModerationListPanel({ t }) {
  const [profiles, setProfiles] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await fetchModeratedProfiles()
    setLoading(false)
    if (err) { setError(err.message); return }
    setProfiles(data)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className={styles.centered}><Spinner size="md" /></div>
  if (error)   return <p className={styles.errorMsg}>{error}</p>

  return (
    <div className={styles.modList}>
      <p className={styles.modListTitle}>{t('market.adminSanctionedUsers')}</p>
      {profiles.length === 0
        ? <p className={styles.empty}>{t('market.adminNoSanctions')}</p>
        : profiles.map(p => (
            <ModerationRow key={p.id} profile={p} onRefresh={load} t={t} />
          ))
      }
    </div>
  )
}

// ── StatsPanel ─────────────────────────────────────────────
function StatsPanel() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!hasSupabase) { setLoading(false); return }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const now = new Date().toISOString()
    Promise.all([
      supabase.from('market_listings').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('type', 'sell'),
      supabase.from('market_listings').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('type', 'buy'),
      supabase.from('market_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('market_listings').select('*', { count: 'exact', head: true }).eq('status', 'sold').gt('updated_at', startOfMonth.toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', false).gt('muted_until', now),
    ]).then(([sell, buy, pending, sold, banned, muted]) => {
      const err = sell.error || buy.error || pending.error || sold.error || banned.error || muted.error
      if (err) { setError(err.message); setLoading(false); return }
      setStats({
        activeListingsSell: sell.count ?? 0,
        activeListingsBuy:  buy.count  ?? 0,
        pendingReports:     pending.count ?? 0,
        completedThisMonth: sold.count ?? 0,
        sanctionedUsers:    (banned.count ?? 0) + (muted.count ?? 0),
      })
      setLoading(false)
    }).catch(err => { setError(err.message); setLoading(false) })
  }, [])

  if (loading) return <div className={styles.centered}><Spinner size="md" /></div>
  if (error)   return <p className={styles.errorMsg}>{error}</p>
  if (!stats)  return null

  const items = [
    { num: stats.activeListingsSell, label: 'Annonces vente actives' },
    { num: stats.activeListingsBuy,  label: 'Annonces achat actives' },
    { num: stats.pendingReports,     label: 'Signalements en attente' },
    { num: stats.completedThisMonth, label: 'Ventes ce mois' },
    { num: stats.sanctionedUsers,    label: 'Utilisateurs sanctionnés' },
  ]

  return (
    <div className={styles.statsGrid}>
      {items.map(({ num, label }) => (
        <div key={label} className={styles.statCard}>
          <span className={styles.statNum}>{num}</span>
          <span className={styles.statLabel}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── AdminMarketPage ────────────────────────────────────────
export default function AdminMarketPage() {
  const { t } = useLang()
  const { user } = useAuth()

  const [isAdmin,  setIsAdmin]  = useState(false)
  const [checking, setChecking] = useState(true)
  const [section,  setSection]  = useState('reports') // 'reports' | 'moderation' | 'stats'
  const [tab,      setTab]      = useState('pending')
  const [reports,  setReports]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

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

  useEffect(() => {
    if (section === 'reports') loadReports()
  }, [section, loadReports])

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

  const pendingCount = reports.filter(r => r.status === 'pending').length

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('market.adminReports')}</h1>

      {/* Section tabs */}
      <div className={styles.sectionTabs}>
        <button
          className={`${styles.sectionTab} ${section === 'reports' ? styles.sectionTabActive : ''}`}
          onClick={() => setSection('reports')}
        >
          📋 {t('market.adminSectionReports')}
        </button>
        <button
          className={`${styles.sectionTab} ${section === 'moderation' ? styles.sectionTabActive : ''}`}
          onClick={() => setSection('moderation')}
        >
          🔨 {t('market.adminSectionModeration')}
        </button>
        <button
          className={`${styles.sectionTab} ${section === 'stats' ? styles.sectionTabActive : ''}`}
          onClick={() => setSection('stats')}
        >
          📊 Statistiques
        </button>
      </div>

      {/* ── Reports section ── */}
      {section === 'reports' && (
        <>
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
                {key === 'pending' && pendingCount > 0 && tab !== 'pending' && (
                  <span className={styles.badge}>{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

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
        </>
      )}

      {/* ── Moderation section ── */}
      {section === 'moderation' && <ModerationListPanel t={t} />}

      {/* ── Stats section ── */}
      {section === 'stats' && <StatsPanel t={t} />}
    </div>
  )
}
