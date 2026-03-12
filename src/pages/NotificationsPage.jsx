import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import { RAIDS } from '@/lib/raids'
import Button from '@/components/ui/Button'
import styles from './NotificationsPage.module.css'

const RAID_MAP = Object.fromEntries(RAIDS.map(r => [r.slug, r]))

export default function NotificationsPage() {
  const { user, isAuthenticated } = useAuth()
  const { t, lang } = useLang()
  const navigate = useNavigate()

  const [notifs,  setNotifs]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasSupabase || !user?.id) { setLoading(false); return }
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setNotifs(data ?? []); setLoading(false) })
  }, [user?.id])

  // Marquer toutes comme lues à l'ouverture
  useEffect(() => {
    if (!hasSupabase || !user?.id) return
    supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .then(() => setNotifs(prev => prev.map(n => ({ ...n, read: true }))))
  }, [user?.id])

  const handleMarkAllRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleDelete = async (id) => {
    setNotifs(prev => prev.filter(n => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{t('notif.title')}</h1>
        <p className={styles.empty}>
          <Link to="/auth?mode=login">{t('nav.signIn')}</Link>
        </p>
      </div>
    )
  }

  const unreadCount = notifs.filter(n => !n.read).length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          🔔 {t('notif.title')}
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount} {t('notif.unread')}</span>
          )}
        </h1>
        {notifs.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
            {t('notif.markAllRead')}
          </Button>
        )}
      </div>

      {loading ? (
        <div className={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.notifCard} ${styles.skeleton}`} />
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <p className={styles.empty}>{t('notif.empty')}</p>
      ) : (
        <div className={styles.list}>
          {notifs.map(n => {
            const raid = RAID_MAP[n.session_raid_name]
            return (
              <div
                key={n.id}
                className={`${styles.notifCard} ${!n.read ? styles.notifUnread : ''}`}
              >
                <div className={styles.notifIcon}>
                  {raid ? (
                    <img
                      src={`https://nosapki.com/images/icons/${raid.icon}.png`}
                      alt=""
                      className={styles.raidIcon}
                    />
                  ) : '💬'}
                </div>
                <div className={styles.notifBody}>
                  <p className={styles.notifType}>
                    {t('notif.raidMessage')}
                    {raid && (
                      <> · <span className={styles.raidName}>{raid[lang] ?? raid.en}</span></>
                    )}
                  </p>
                  {n.content_preview && (
                    <p className={styles.notifPreview}>"{n.content_preview}"</p>
                  )}
                  <p className={styles.notifTime}>
                    {new Date(n.created_at).toLocaleString(
                      lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-US',
                      { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
                    )}
                  </p>
                </div>
                <div className={styles.notifActions}>
                  {n.session_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/raids/${n.session_id}`)}
                    >
                      {t('notif.viewSession')} →
                    </Button>
                  )}
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(n.id)}
                    title="Supprimer"
                  >✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
