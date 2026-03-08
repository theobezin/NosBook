import { useState, useEffect, useMemo } from 'react'
import { useAdmin } from '@/hooks/useAdmin'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import { RAIDS } from '@/lib/raids'
import Button from '@/components/ui/Button'
import styles from './AdminRaidsPage.module.css'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

const RAID_NAMES = Object.fromEntries(RAIDS.map(r => [r.slug, r]))

const SERVER_COLORS = {
  undercity:  '#7c6ce0',
  dragonveil: '#e06c5a',
}

const STATUS_COLORS = {
  pending:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)'  },
  approved: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'   },
  rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'   },
}

const FILTERS = ['pending', 'approved', 'rejected', 'all']

// ── RecordRow ─────────────────────────────────────────────────────────────────

function RecordRow({ record, lang, t, onApprove, onReject }) {
  const [rejecting,  setRejecting]  = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [busy,       setBusy]       = useState(false)
  const [feedback,   setFeedback]   = useState(null) // 'ok' | 'err'

  const raid = RAID_NAMES[record.raid_slug]
  const raidName = raid ? (raid[lang] ?? raid.en) : record.raid_slug
  const status = STATUS_COLORS[record.status] ?? STATUS_COLORS.pending

  const handleApprove = async () => {
    setBusy(true)
    setFeedback(null)
    const ok = await onApprove(record.id)
    setFeedback(ok ? 'ok' : 'err')
    setBusy(false)
  }

  const handleReject = async () => {
    setBusy(true)
    setFeedback(null)
    const ok = await onReject(record.id, rejectNote.trim() || null)
    if (ok) {
      setRejecting(false)
      setRejectNote('')
    }
    setFeedback(ok ? 'ok' : 'err')
    setBusy(false)
  }

  const isDone = record.status === 'approved' || record.status === 'rejected'

  return (
    <div className={`${styles.row} ${isDone ? styles.rowDone : ''}`}>

      {/* En-tête : raid + serveur + statut */}
      <div className={styles.rowHead}>
        <span className={styles.rowRaid}>{raidName}</span>
        <span className={styles.rowServer} style={{ color: SERVER_COLORS[record.server], borderColor: SERVER_COLORS[record.server] + '55' }}>
          {t(`raids.server.${record.server}`)}
        </span>
        <span
          className={styles.rowStatus}
          style={{ color: status.color, background: status.bg, borderColor: status.border }}
        >
          {t(`admin.status.${record.status}`)}
        </span>
      </div>

      {/* Corps */}
      <div className={styles.rowBody}>
        <div className={styles.rowMeta}>
          <span className={styles.rowTime}>⏱ {formatTime(record.time_seconds)}</span>
          <span className={styles.rowTeam}>👥 {record.team_members.join(', ')}</span>
          <span className={styles.rowDate}>📅 {formatDate(record.submitted_at)}</span>
        </div>

        <div className={styles.rowActions}>
          <a
            href={record.proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.proofLink}
            title={t(`raids.proofType.${record.proof_type}`)}
          >
            {record.proof_type === 'video' ? '🎬' : '📸'} {t('admin.viewProof')}
          </a>

          {!isDone && !rejecting && (
            <>
              <Button variant="solid" size="sm" onClick={handleApprove} disabled={busy}>
                {busy ? '…' : t('admin.approve')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRejecting(true)} disabled={busy}>
                {t('admin.reject')}
              </Button>
            </>
          )}

          {!isDone && rejecting && (
            <div className={styles.rejectForm}>
              <input
                className={styles.rejectInput}
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder={t('admin.rejectNotePlaceholder')}
                maxLength={200}
              />
              <Button variant="ghost" size="sm" onClick={handleReject} disabled={busy} className={styles.rejectConfirmBtn}>
                {busy ? '…' : t('admin.confirmReject')}
              </Button>
              <button className={styles.cancelReject} onClick={() => { setRejecting(false); setRejectNote('') }}>✕</button>
            </div>
          )}

          {isDone && record.status === 'rejected' && record.admin_note && (
            <span className={styles.adminNote}>💬 {record.admin_note}</span>
          )}

          {feedback === 'err' && (
            <span className={styles.feedbackErr}>{t('admin.actionError')}</span>
          )}
        </div>
      </div>

    </div>
  )
}

// ── AdminRaidsPage ────────────────────────────────────────────────────────────

export default function AdminRaidsPage() {
  const { isAdmin, loading: adminLoading } = useAdmin()
  const { t, lang } = useLang()

  const [filter,  setFilter]  = useState('pending')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin || !hasSupabase) return

    setLoading(true)
    let q = supabase
      .from('raid_records')
      .select('id, raid_slug, server, team_members, time_seconds, proof_url, proof_type, submitted_at, status, admin_note')
      .order('submitted_at', { ascending: false })
      .limit(200)

    if (filter !== 'all') q = q.eq('status', filter)

    q.then(({ data }) => setRecords(data ?? [])).finally(() => setLoading(false))
  }, [isAdmin, filter])

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 }
    records.forEach(r => { if (c[r.status] !== undefined) c[r.status]++ })
    return c
  }, [records])

  const approve = async (id) => {
    const { error } = await supabase
      .from('raid_records')
      .update({ status: 'approved', admin_note: null })
      .eq('id', id)
    if (!error) {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'approved', admin_note: null } : r))
      return true
    }
    return false
  }

  const reject = async (id, note) => {
    const { error } = await supabase
      .from('raid_records')
      .update({ status: 'rejected', admin_note: note })
      .eq('id', id)
    if (!error) {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', admin_note: note } : r))
      return true
    }
    return false
  }

  // ── Chargement de la session admin ──
  if (adminLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingMsg}>…</div>
      </div>
    )
  }

  // ── Accès refusé ──
  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.denied}>
          <div className={styles.deniedIcon}>🔒</div>
          <h1 className={styles.deniedTitle}>{t('admin.denied')}</h1>
          <p className={styles.deniedSub}>{t('admin.deniedSub')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>

      {/* ── En-tête ── */}
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>{t('admin.badge')}</div>
          <h1 className={styles.title}>{t('admin.title')}</h1>
          <p className={styles.sub}>{t('admin.sub')}</p>
        </div>
        <div className={styles.globalStats}>
          <div className={styles.globalStat} style={{ color: STATUS_COLORS.pending.color }}>
            <span className={styles.globalStatVal}>{counts.pending}</span>
            <span className={styles.globalStatKey}>{t('admin.status.pending')}</span>
          </div>
          <div className={styles.globalStat} style={{ color: STATUS_COLORS.approved.color }}>
            <span className={styles.globalStatVal}>{counts.approved}</span>
            <span className={styles.globalStatKey}>{t('admin.status.approved')}</span>
          </div>
          <div className={styles.globalStat} style={{ color: STATUS_COLORS.rejected.color }}>
            <span className={styles.globalStatVal}>{counts.rejected}</span>
            <span className={styles.globalStatKey}>{t('admin.status.rejected')}</span>
          </div>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
            style={filter === f && f !== 'all' ? { '--fc': STATUS_COLORS[f]?.color } : {}}
            onClick={() => setFilter(f)}
          >
            {t(`admin.filter.${f}`)}
          </button>
        ))}
      </div>

      {/* ── Liste ── */}
      <div className={styles.list}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`${styles.row} ${styles.rowSkeleton}`} />
          ))
        ) : records.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>✅</span>
            <span>{t('admin.empty')}</span>
          </div>
        ) : (
          records.map(record => (
            <RecordRow
              key={record.id}
              record={record}
              lang={lang}
              t={t}
              onApprove={approve}
              onReject={reject}
            />
          ))
        )}
      </div>

    </div>
  )
}
