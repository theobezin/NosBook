import { useState, useEffect } from 'react'
import { useAdmin } from '@/hooks/useAdmin'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import styles from './AdminHistoryPage.module.css'

const ACTION_META = {
  raid_approved:    { label: 'Record approuvé',          icon: '✅', color: '#22c55e', type: 'validation' },
  raid_rejected:    { label: 'Record rejeté',            icon: '❌', color: '#ef4444', type: 'validation' },
  report_validated: { label: 'Signalement validé',       icon: '⚠️', color: '#f59e0b', type: 'sanction'  },
  report_rejected:  { label: 'Signalement rejeté',       icon: '🚫', color: '#6b7280', type: 'validation' },
  mute:             { label: 'Mute',                     icon: '🔇', color: '#e67e22', type: 'sanction'  },
  ban:              { label: 'Ban',                      icon: '🔨', color: '#e74c3c', type: 'sanction'  },
  unmute:           { label: 'Unmute',                   icon: '🔊', color: '#3498db', type: 'sanction'  },
  unban:            { label: 'Unban',                    icon: '✅', color: '#2ecc71', type: 'sanction'  },
}

const FILTERS = [
  { id: 'all',        label: 'Tout' },
  { id: 'sanction',   label: 'Sanctions' },
  { id: 'validation', label: 'Validations' },
]

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

export default function AdminHistoryPage() {
  const { isModerator, loading: adminLoading } = useAdmin()
  const { t } = useLang()

  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')
  const [page,    setPage]    = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const PAGE_SIZE = 30

  useEffect(() => {
    if (!isModerator || !hasSupabase) { setLoading(false); return }
    setLoading(true)
    setPage(0)
    supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE + 1)
      .then(({ data }) => {
        const rows = data ?? []
        setHasMore(rows.length > PAGE_SIZE)
        setLogs(rows.slice(0, PAGE_SIZE))
      })
      .finally(() => setLoading(false))
  }, [isModerator])

  async function loadMore() {
    const nextPage = page + 1
    const { data } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE)
    const rows = data ?? []
    setHasMore(rows.length === PAGE_SIZE + 1)
    setLogs(prev => [...prev, ...rows.slice(0, PAGE_SIZE)])
    setPage(nextPage)
  }

  if (adminLoading) return null
  if (!isModerator) return <div className={styles.denied}>⛔ Accès refusé</div>

  const filtered = filter === 'all'
    ? logs
    : logs.filter(l => ACTION_META[l.action]?.type === filter)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>📋 Historique des actions</h1>
      <p className={styles.sub}>Actions effectuées par les admins et modérateurs NosBook.</p>

      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`${styles.filterBtn} ${filter === f.id ? styles.filterActive : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>Aucune action enregistrée.</div>
      ) : (
        <div className={styles.list}>
          {filtered.map(log => {
            const meta = ACTION_META[log.action] ?? { label: log.action, icon: '•', color: '#999' }
            const details = log.details ?? {}
            return (
              <div key={log.id} className={styles.row}>
                <div className={styles.rowIcon} style={{ color: meta.color }}>{meta.icon}</div>
                <div className={styles.rowContent}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowAction} style={{ color: meta.color }}>{meta.label}</span>
                    {log.target_username && (
                      <>
                        <span className={styles.rowSep}>→</span>
                        <span className={styles.rowTarget}>{log.target_username}</span>
                      </>
                    )}
                    {details.duration_days && (
                      <span className={styles.rowDetail}>({details.duration_days}j)</span>
                    )}
                    {details.raid_slug && (
                      <span className={styles.rowDetail}>[{details.raid_slug}]</span>
                    )}
                  </div>
                  <div className={styles.rowMeta}>
                    <span className={styles.rowActor}>par {log.actor_username ?? '—'}</span>
                    <span className={styles.rowDate}>{formatDate(log.created_at)}</span>
                  </div>
                  {details.note && (
                    <div className={styles.rowNote}>💬 {details.note}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasMore && !loading && (
        <button className={styles.loadMore} onClick={loadMore}>
          Charger plus
        </button>
      )}
    </div>
  )
}
