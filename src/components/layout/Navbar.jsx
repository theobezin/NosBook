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

  const [menuOpen,     setMenuOpen]     = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const menuRef = useRef(null)

  // Badge admin : nombre de records en attente
  useEffect(() => {
    if (!isAdmin || !hasSupabase) return
    supabase
      .from('raid_records')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? 0))
  }, [isAdmin])

  // Fermeture du menu au clic extérieur
  useEffect(() => {
    if (!menuOpen) return
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

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
          {isAdmin && (
            <NavLink
              to="/admin/raids"
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''} ${styles.adminLink}`}
            >
              🛡️ Admin
              {pendingCount > 0 && (
                <span className={styles.adminBadge}>{pendingCount > 99 ? '99+' : pendingCount}</span>
              )}
            </NavLink>
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
                    <span className={styles.userMenuCaret}>{menuOpen ? '▴' : '▾'}</span>
                  </button>

                  {menuOpen && (
                    <div className={styles.userMenu}>
                      <Link
                        to="/submissions"
                        className={styles.userMenuItem}
                        onClick={() => setMenuOpen(false)}
                      >
                        📋 {t('nav.mySubmissions')}
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
