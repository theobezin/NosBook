import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import styles from './FriendsPage.module.css'

export default function FriendsPage() {
  const { user, isAuthenticated } = useAuth()
  const { t } = useLang()

  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasSupabase || !user?.id) { setLoading(false); return }

    supabase
      .from('friendships')
      .select('id, requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .then(async ({ data: rows }) => {
        if (!rows || rows.length === 0) { setFriends([]); setLoading(false); return }

        // Collect friend IDs (the one that is NOT the current user)
        const friendIds = rows.map(r =>
          r.requester_id === user.id ? r.addressee_id : r.requester_id
        )

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, server')
          .in('id', friendIds)

        const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

        setFriends(rows.map(r => {
          const friendId = r.requester_id === user.id ? r.addressee_id : r.requester_id
          return { friendshipId: r.id, ...profileMap[friendId] }
        }))
        setLoading(false)
      })
  }, [user?.id])

  const handleRemove = async (friendshipId) => {
    setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId))
    await supabase.from('friendships').delete().eq('id', friendshipId)
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{t('friends.title')}</h1>
        <p className={styles.empty}>
          <Link to="/auth?mode=login">{t('nav.signIn')}</Link>
        </p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          👥 {t('friends.title')}
          {friends.length > 0 && (
            <span className={styles.count}>{friends.length}</span>
          )}
        </h1>
      </div>

      {loading ? (
        <div className={styles.list}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${styles.card} ${styles.skeleton}`} />
          ))}
        </div>
      ) : friends.length === 0 ? (
        <p className={styles.empty}>{t('friends.empty')}</p>
      ) : (
        <div className={styles.list}>
          {friends.map(f => (
            <div key={f.friendshipId} className={styles.card}>
              <div className={styles.avatar}>
                {f.avatar_url
                  ? <img src={f.avatar_url} alt="" className={styles.avatarImg} />
                  : <span className={styles.avatarFallback}>👤</span>
                }
              </div>
              <div className={styles.info}>
                <span className={styles.username}>{f.username}</span>
                {f.server && (
                  <span className={styles.server}>{f.server}</span>
                )}
              </div>
              <div className={styles.actions}>
                <Link to={`/players/${f.username}`}>
                  <Button variant="ghost" size="sm">{t('friends.viewProfile')}</Button>
                </Link>
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemove(f.friendshipId)}
                  title={t('friends.remove')}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
