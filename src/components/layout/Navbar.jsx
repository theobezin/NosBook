import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAdmin } from '@/hooks/useAdmin'
import { useLang } from '@/i18n'
import Button from '@/components/ui/Button'
import styles from './Navbar.module.css'

const LANGS = ['en', 'fr', 'de']

export default function Navbar() {
  const { isAuthenticated, user, signOut } = useAuth()
  const { isAdmin } = useAdmin()
  const { lang, setLang, t } = useLang()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const linkClass = ({ isActive }) =>
    `${styles.link} ${isActive ? styles.active : ''}`

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>

        <Link to="/" className={styles.logo}>
          <span className={styles.logoWhite}>Nos</span>Book
        </Link>

        <div className={styles.links}>
          <NavLink to="/" end className={linkClass}>{t('nav.hub')}</NavLink>
          <NavLink to="/players" className={linkClass}>{t('nav.profile')}</NavLink>
          <NavLink to="/raids" className={linkClass}>{t('nav.raids')}</NavLink>
          {isAdmin && (
            <NavLink to="/admin/raids" className={linkClass + ' ' + styles.adminLink}>
              🛡️ Admin
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
                <span className={styles.username}>
                  {user?.user_metadata?.username || user?.email?.split('@')[0]}
                </span>
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
