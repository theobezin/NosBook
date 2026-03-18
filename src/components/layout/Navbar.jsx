import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAdmin } from '@/hooks/useAdmin'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import styles from './Navbar.module.css'

const LANGS = ['en', 'fr', 'de']

export default function Navbar() {
  const { isAuthenticated, user, signOut } = useAuth()
  const { isAdmin } = useAdmin()
  const { lang, setLang, t } = useLang()
  const navigate = useNavigate()

  const [menuOpen,      setMenuOpen]      = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const [pendingCount,  setPendingCount]  = useState(0)
  const [unreadCount,  setUnreadCount]  = useState(0)
  const [marketPending, setMarketPending] = useState(0)
  const menuRef      = useRef(null)
  const adminMenuRef = useRef(null)

  // Badge admin : records raids en attente
  useEffect(() => {
    if (!isAdmin || !hasSupabase) return
    supabase
      .from('raid_records')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? 0))
  }, [isAdmin])


  // Badge admin : signalements marché en attente
  // Badge notifications non-lues
  useEffect(() => {
    if (!user?.id || !hasSupabase) return
    // Chargement initial
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .then(({ count }) => setUnreadCount(count ?? 0))
    // Realtime
    const ch = supabase
      .channel(`notif-badge-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false)
          .then(({ count }) => setUnreadCount(count ?? 0))
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user?.id])

  // Fermeture du menu au clic extérieur
  useEffect(() => {
    if (!isAdmin || !hasSupabase) return
    supabase
      .from('market_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setMarketPending(count ?? 0))
  }, [isAdmin])

  // Fermeture des menus au clic extérieur
  useEffect(() => {
    if (!menuOpen && !adminMenuOpen) return
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target)) setAdminMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen, adminMenuOpen])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const linkClass = ({ isActive }) =>
    `${styles.link} ${isActive ? styles.active : ''}`

  const username = user?.user_metadata?.username || user?.email?.split('@')[0]

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>

        <Link to="/" className={styles.logo}>
          <span className={styles.logoWhite}>Nos</span>Book
        </Link>

        <div className={styles.links}>
          <NavLink to="/" end className={linkClass}>{t('nav.hub')}</NavLink>
          <NavLink to="/players" className={linkClass}>{t('nav.profile')}</NavLink>
          <NavLink to="/planner" className={linkClass}>{t('nav.planner')}</NavLink>
          {isAdmin && (
            <div className={styles.adminMenuWrap} ref={adminMenuRef}>
              <button
                className={`${styles.link} ${styles.adminLink} ${styles.adminMenuTrigger}`}
                onClick={() => setAdminMenuOpen(v => !v)}
              >
                🛡️ Admin
                {(pendingCount + marketPending) > 0 && (
                  <span className={styles.adminBadge}>
                    {(pendingCount + marketPending) > 99 ? '99+' : pendingCount + marketPending}
                  </span>
                )}
                <span className={styles.userMenuCaret}>{adminMenuOpen ? '▴' : '▾'}</span>
              </button>

              {adminMenuOpen && (
                <div className={styles.adminMenu}>
                  <Link
                    to="/admin/raids"
                    className={styles.userMenuItem}
                    onClick={() => setAdminMenuOpen(false)}
                  >
                    📊 Classement PVE
                    {pendingCount > 0 && (
                      <span className={styles.adminBadge}>{pendingCount}</span>
                    )}
                  </Link>
                  <Link
                    to="/admin/market"
                    className={styles.userMenuItem}
                    onClick={() => setAdminMenuOpen(false)}
                  >
                    🏷️ Marché
                    {marketPending > 0 && (
                      <span className={styles.adminBadge}>{marketPending}</span>
                    )}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.right}>
          <div className={styles.langSwitcher}>
            {LANGS.map(l => (
              <button
                key={l}
                className={`${styles.langBtn} ${lang === l ? styles.langActive : ''}`}
                onClick={() => setLang(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <div className={styles.auth}>
            {isAuthenticated ? (
              <>
                {/* Menu utilisateur */}
                <div className={styles.userMenuWrap} ref={menuRef}>
                  <button
                    className={styles.userMenuTrigger}
                    onClick={() => setMenuOpen(v => !v)}
                    aria-expanded={menuOpen}
                  >
                    <span className={styles.usernameText}>{username}</span>
                    {unreadCount > 0 && (
                      <span className={styles.notifBadge}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    <span className={styles.userMenuCaret}>{menuOpen ? '▴' : '▾'}</span>
                  </button>

                  {menuOpen && (
                    <div className={styles.userMenu}>
                      <Link
                        to='/profile'
                        className={styles.userMenuItem}
                        onClick={() => setMenuOpen(false)}
                      >
                        👤 {t('nav.myProfile')}
                      </Link>
                      <Link
                        to="/submissions"
                        className={styles.userMenuItem}
                        onClick={() => setMenuOpen(false)}
                      >
                        📋 {t('nav.mySubmissions')}
                      </Link>
                      <Link
                        to="/notifications"
                        className={styles.userMenuItem}
                        onClick={() => setMenuOpen(false)}
                      >
                        🔔 {t('notif.title')}
                        {unreadCount > 0 && (
                          <span className={styles.notifMenuBadge}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        to="/friends"
                        className={styles.userMenuItem}
                        onClick={() => setMenuOpen(false)}
                      >
                        👥 {t('friends.title')}
                      </Link>
                      <Link
                        to="/family"
                        className={styles.userMenuItem}
                        onClick={() => setMenuOpen(false)}
                      >
                        🏠 {t('family.navLabel')}
                      </Link>
                    </div>
                  )}
                </div>

                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  {t('nav.signOut')}
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth?mode=login">
                  <Button variant="ghost" size="sm">{t('nav.signIn')}</Button>
                </Link>
                <Link to="/auth?mode=register">
                  <Button variant="solid" size="sm">{t('nav.signUp')}</Button>
                </Link>
              </>
            )}
          </div>
        </div>

      </div>
    </nav>
  )
}
