import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import { RAIDS } from '@/lib/raids'
import Button from '@/components/ui/Button'
import styles from './NotificationsPage.module.css'

const RAID_MAP = Object.fromEntries(RAIDS.map(r => [r.slug, r]))

const MARKET_TYPES = ['market_outbid', 'market_offer_accepted', 'market_offer_rejected', 'market_new_offer', 'listing_comment']
const FAMILY_TYPE  = 'family_invite'

export default function NotificationsPage() {
  const { user, isAuthenticated } = useAuth()
  const { t, lang } = useLang()
  const navigate = useNavigate()

  const [notifs,      setNotifs]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('unread') // 'unread' | 'read'
  const [myCharacters, setMyCharacters] = useState([])
  const [charPick,    setCharPick]    = useState({}) // notif_id → character_id

  useEffect(() => {
    if (!hasSupabase || !user?.id) { setLoading(false); return }
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setNotifs(data ?? []); setLoading(false) })
  }, [user?.id])

  useEffect(() => {
    if (!hasSupabase || !user?.id) return
    supabase.from('characters').select('id, name').eq('profile_id', user.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setMyCharacters(data ?? []))
  }, [user?.id])

  const handleMarkAllRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setTab('read')
  }

  const handleMarkRead = async (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  const handleDelete = async (id) => {
    setNotifs(prev => prev.filter(n => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  const getPickedChars = (notifId) =>
    charPick[notifId] ?? (myCharacters[0] ? [myCharacters[0].id] : [])

  const toggleCharPick = (notifId, charId) => {
    setCharPick(prev => {
      const current = prev[notifId] ?? (myCharacters[0] ? [myCharacters[0].id] : [])
      const has = current.includes(charId)
      const next = has ? current.filter(id => id !== charId) : [...current, charId]
      return { ...prev, [notifId]: next }
    })
  }

  const handleFamilyInvite = async (n, accept) => {
    if (accept && n.family_id) {
      const charIds = getPickedChars(n.id)
      if (charIds.length === 0) return
      for (const cid of charIds) {
        await supabase.from('family_members').insert({
          family_id:    n.family_id,
          profile_id:   user.id,
          character_id: cid,
          role:         'member',
        })
      }
    }
    setCharPick(prev => { const next = { ...prev }; delete next[n.id]; return next })
    setNotifs(prev => prev.filter(notif => notif.id !== n.id))
    await supabase.from('notifications').delete().eq('id', n.id)
  }

  const handleFriendRequest = async (n, accept) => {
    if (!n.related_user_id) return
    await supabase
      .from('friendships')
      .update({ status: accept ? 'accepted' : 'rejected', updated_at: new Date().toISOString() })
      .eq('requester_id', n.related_user_id)
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
    setNotifs(prev => prev.filter(notif => notif.id !== n.id))
    await supabase.from('notifications').delete().eq('id', n.id)
  }

  const handleNavigate = (id, path) => {
    handleMarkRead(id)
    navigate(path)
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
  const displayed   = notifs.filter(n => tab === 'unread' ? !n.read : n.read)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          🔔 {t('notif.title')}
        </h1>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
            {t('notif.markAllRead')}
          </Button>
        )}
      </div>

      {/* Onglets Lues / Non lues */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'unread' ? styles.tabActive : ''}`}
          onClick={() => setTab('unread')}
        >
          {t('notif.tabUnread')}
          {unreadCount > 0 && <span className={styles.tabBadge}>{unreadCount}</span>}
        </button>
        <button
          className={`${styles.tab} ${tab === 'read' ? styles.tabActive : ''}`}
          onClick={() => setTab('read')}
        >
          {t('notif.tabRead')}
        </button>
      </div>

      {loading ? (
        <div className={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.notifCard} ${styles.skeleton}`} />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <p className={styles.empty}>
          {tab === 'unread' ? t('notif.emptyUnread') : t('notif.emptyRead')}
        </p>
      ) : (
        <div className={styles.list}>
          {displayed.map(n => {
            const raid = RAID_MAP[n.session_raid_name]
            const isFriendRequest = n.type === 'friend_request'
            const isFamilyInvite  = n.type === FAMILY_TYPE
            const isMarket        = MARKET_TYPES.includes(n.type)
            return (
              <div
                key={n.id}
                className={`${styles.notifCard} ${!n.read ? styles.notifUnread : ''}`}
              >
                <div className={styles.notifIcon}>
                  {isFamilyInvite ? (
                    <span className={styles.cancelledIcon}>🏠</span>
                  ) : isFriendRequest ? (
                    <span className={styles.cancelledIcon}>👥</span>
                  ) : n.type === 'session_cancelled' ? (
                    <span className={styles.cancelledIcon}>🚫</span>
                  ) : n.type === 'session_invite' ? (
                    <span className={styles.cancelledIcon}>📨</span>
                  ) : n.type === 'market_outbid' ? (
                    <span className={styles.cancelledIcon}>⚡</span>
                  ) : n.type === 'market_offer_accepted' ? (
                    <span className={styles.cancelledIcon}>✅</span>
                  ) : n.type === 'market_offer_rejected' ? (
                    <span className={styles.cancelledIcon}>❌</span>
                  ) : n.type === 'market_new_offer' ? (
                    <span className={styles.cancelledIcon}>🛒</span>
                  ) : n.type === 'listing_comment' ? (
                    <span className={styles.cancelledIcon}>💬</span>
                  ) : raid ? (
                    <img
                      src={`https://nosapki.com/images/icons/${raid.icon}.png`}
                      alt=""
                      className={styles.raidIcon}
                    />
                  ) : '💬'}
                </div>
                <div className={styles.notifBody}>
                  <p className={styles.notifType}>
                    {isFamilyInvite
                      ? t('notif.familyInvite')
                      : isFriendRequest
                      ? t('notif.friendRequest')
                      : n.type === 'session_cancelled'
                      ? t('notif.sessionCancelled')
                      : n.type === 'session_invite'
                      ? t('notif.sessionInvite')
                      : n.type === 'market_outbid'
                      ? t('notif.marketOutbid')
                      : n.type === 'market_offer_accepted'
                      ? t('notif.marketOfferAccepted')
                      : n.type === 'market_offer_rejected'
                      ? t('notif.marketOfferRejected')
                      : n.type === 'market_new_offer'
                      ? t('notif.marketNewOffer')
                      : n.type === 'listing_comment'
                      ? t('notif.listingComment')
                      : t('notif.raidMessage')}
                    {raid && (
                      <> · <span className={styles.raidName}>{raid[lang] ?? raid.en}</span></>
                    )}
                  </p>
                  {isFamilyInvite && (
                    <>
                      <p className={styles.notifPreview}>
                        {t('notif.familyInviteSub')}{' '}
                        <strong>{n.content_preview}</strong>
                      </p>
                      {myCharacters.length > 0 && (
                        <div className={styles.charCheckList}>
                          {myCharacters.map(c => {
                            const picked = getPickedChars(n.id).includes(c.id)
                            return (
                              <label key={c.id} className={styles.charCheckItem}>
                                <input
                                  type="checkbox"
                                  checked={picked}
                                  onChange={() => toggleCharPick(n.id, c.id)}
                                />
                                <span>{c.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                  {isFriendRequest && n.content_preview && (
                    <p className={styles.notifPreview}>
                      <Link to={`/players/${n.content_preview}`} className={styles.friendLink}>
                        {n.content_preview}
                      </Link>
                      {' '}{t('notif.friendRequestSub')}
                    </p>
                  )}
                  {n.type === 'session_invite' && n.content_preview && (
                    <p className={styles.notifPreview}>
                      <Link to={`/players/${n.content_preview}`} className={styles.friendLink}>
                        {n.content_preview}
                      </Link>
                      {' '}{t('notif.sessionInviteSub')}
                    </p>
                  )}
                  {n.type === 'market_outbid' && n.content_preview && (
                    <p className={styles.notifPreview}>
                      {t('notif.marketOutbidSub')} <strong>"{n.content_preview}"</strong>
                    </p>
                  )}
                  {n.type === 'market_offer_accepted' && n.content_preview && (
                    <p className={styles.notifPreview}>
                      {t('notif.marketOfferAcceptedSub')} <strong>"{n.content_preview}"</strong>
                    </p>
                  )}
                  {n.type === 'market_offer_rejected' && n.content_preview && (
                    <p className={styles.notifPreview}>
                      {t('notif.marketOfferRejectedSub')} <strong>"{n.content_preview}"</strong>
                    </p>
                  )}
                  {n.type === 'market_new_offer' && n.content_preview && (
                    <p className={styles.notifPreview}>
                      {t('notif.marketNewOfferSub')} <strong>"{n.content_preview}"</strong>
                    </p>
                  )}
                  {n.type === 'listing_comment' && n.content_preview && (
                    <p className={styles.notifPreview}>{n.content_preview}</p>
                  )}
                  {!isFriendRequest && n.type !== 'session_invite' && !isMarket && n.content_preview && (
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
                  {isFamilyInvite ? (
                    <>
                      <Button variant="solid" size="sm" onClick={() => handleFamilyInvite(n, true)} disabled={getPickedChars(n.id).length === 0}>
                        {t('notif.familyAccept')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleFamilyInvite(n, false)}>
                        {t('notif.familyDecline')}
                      </Button>
                    </>
                  ) : isFriendRequest ? (
                    <>
                      <Button
                        variant="solid"
                        size="sm"
                        onClick={() => handleFriendRequest(n, true)}
                      >
                        {t('notif.friendAccept')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFriendRequest(n, false)}
                      >
                        {t('notif.friendDecline')}
                      </Button>
                    </>
                  ) : (
                    <>
                      {n.session_id && n.type !== 'session_cancelled' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNavigate(n.id, `/raids/${n.session_id}`)}
                        >
                          {t('notif.viewSession')} →
                        </Button>
                      )}
                      {isMarket && n.listing_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNavigate(n.id, `/market/${n.listing_id}`)}
                        >
                          {t('notif.viewListing')} →
                        </Button>
                      )}
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(n.id)}
                        title="Supprimer"
                      >✕</button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
