import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { supabase, hasSupabase } from '@/lib/supabase'
import { CLASSES } from '@/lib/mockData'
import Button from '@/components/ui/Button'
import styles from './PlayersPage.module.css'

export default function PlayersPage() {
  const { isAuthenticated } = useAuth()
  const { t } = useLang()

  const [query,    setQuery]    = useState('')
  const [accounts, setAccounts] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!hasSupabase) { setLoading(false); return }

    supabase
      .from('profiles')
      .select('username, characters(id, name, class, sort_order)')
      .order('username')
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setAccounts(data.map(p => ({
            username:   p.username,
            characters: [...(p.characters ?? [])].sort((a, b) => a.sort_order - b.sort_order),
          })))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = query.trim()
    ? accounts.filter(a => a.username.toLowerCase().includes(query.toLowerCase()))
    : accounts

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('players.title')}</h1>
          <p className={styles.sub}>{t('players.sub')}</p>
        </div>
        {isAuthenticated && (
          <Link to="/profile">
            <Button variant="solid" size="md">{t('players.myProfile')}</Button>
          </Link>
        )}
      </div>

      <div className={styles.searchWrap}>
        <div className={styles.searchInner}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('players.searchPlaceholder')}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery('')}>✕</button>
          )}
        </div>
      </div>

      <div className={styles.list}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.playerCard} ${styles.playerCardSkeleton}`} />
          ))
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🔎</span>
            <span>{t('players.noResults')}</span>
          </div>
        ) : (
          filtered.map((account, i) => {
            const mainChar  = account.characters[0]
            const cls       = mainChar ? (CLASSES[mainChar.class] ?? null) : null
            const icon      = cls ? cls.icon  : '👤'
            const iconColor = cls ? cls.color : 'var(--text-faint)'

            return (
              <Link
                key={i}
                to={`/players/${encodeURIComponent(account.username)}`}
                className={styles.playerCard}
              >
                <div
                  className={styles.playerAvatar}
                  style={{ borderColor: iconColor + '66', color: iconColor }}
                >
                  {icon}
                </div>

                <div className={styles.playerInfo}>
                  <span className={styles.playerName}>{account.username}</span>
                  <span className={styles.playerMeta}>
                    {account.characters.length} {t('players.chars')}
                    {account.characters.length > 0 && (
                      <>
                        <span className={styles.dot}>·</span>
                        {account.characters.map((c, j) => {
                          const cc = CLASSES[c.class] ?? CLASSES.Archer
                          return (
                            <span key={j} title={c.name} style={{ color: cc.color }}>
                              {cc.icon}
                            </span>
                          )
                        })}
                      </>
                    )}
                  </span>
                </div>

                <span className={styles.arrow}>→</span>
              </Link>
            )
          })
        )}
      </div>

    </div>
  )
}
