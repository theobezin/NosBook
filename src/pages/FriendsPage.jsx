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

  const [friends,       setFriends]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [myMembership,  setMyMembership]  = useState(null) // { family, role } | null
  const [friendFamilies, setFriendFamilies] = useState(new Set()) // profile_ids ayant déjà une famille
  const [invitedIds,    setInvitedIds]    = useState(new Set())

  useEffect(() => {
    if (!hasSupabase || !user?.id) { setLoading(false); return }
    loadAll()
  }, [user?.id])

  async function loadAll() {
    setLoading(true)
    const { data: rows } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    if (!rows || rows.length === 0) {
      setFriends([])
      setLoading(false)
      // Charge quand même le membership
      loadMyMembership()
      return
    }

    const friendIds = rows.map(r =>
      r.requester_id === user.id ? r.addressee_id : r.requester_id
    )

    const [{ data: profiles }, { data: fmRows }, myMem] = await Promise.all([
      supabase.from('profiles').select('id, username, avatar_url, server').in('id', friendIds),
      supabase.from('family_members').select('profile_id').in('profile_id', friendIds),
      loadMyMembership(),
    ])

    setFriendFamilies(new Set((fmRows ?? []).map(m => m.profile_id)))

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
    setFriends(rows.map(r => {
      const friendId = r.requester_id === user.id ? r.addressee_id : r.requester_id
      return { friendshipId: r.id, ...profileMap[friendId] }
    }))

    setLoading(false)
  }

  async function loadMyMembership() {
    const { data } = await supabase
      .from('family_members')
      .select('role, family_id, families(id, name)')
      .eq('profile_id', user.id)
      .maybeSingle()
    const mem = data?.families ? { family: data.families, role: data.role } : null
    setMyMembership(mem)
    return mem
  }

  const handleRemove = async (friendshipId) => {
    setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId))
    await supabase.from('friendships').delete().eq('id', friendshipId)
  }

  const handleInvite = async (friend) => {
    if (!myMembership) return
    await supabase.from('notifications').insert({
      user_id:         friend.id,
      type:            'family_invite',
      content_preview: myMembership.family.name,
      related_user_id: user.id,
      family_id:       myMembership.family.id,
    })
    setInvitedIds(prev => new Set([...prev, friend.id]))
  }

  const canInvite = myMembership?.role === 'head' || myMembership?.role === 'assistant'

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
          {friends.map(f => {
            const alreadyInFamily = friendFamilies.has(f.id)
            const invited         = invitedIds.has(f.id)

            return (
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

                  {/* Bouton invitation famille */}
                  {canInvite && (
                    alreadyInFamily ? (
                      <span className={styles.alreadyInFamily}>{t('friends.alreadyInFamily')}</span>
                    ) : invited ? (
                      <span className={styles.inviteSent}>{t('friends.inviteSent')}</span>
                    ) : (
                      <button className={styles.inviteBtn} onClick={() => handleInvite(f)}>
                        🏠 {t('friends.inviteToFamily')}
                      </button>
                    )
                  )}

                  <button
                    className={styles.removeBtn}
                    onClick={() => handleRemove(f.friendshipId)}
                    title={t('friends.remove')}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
