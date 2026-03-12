import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { mockHubStats } from '@/lib/mockData'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import styles from './HubPage.module.css'

// ── RSS helpers ────────────────────────────────────────────────────────────
// Fetched via allorigins.win to bypass browser CORS restrictions.
const STEAM_LANG = { en: 'en', fr: 'fr', de: 'german' }

function feedUrl(lang) {
  const l = STEAM_LANG[lang] ?? 'en'
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://store.steampowered.com/feeds/news/app/550470/?l=${l}`)}`
}

function getText(item, tag) {
  return item.querySelector(tag)?.textContent?.trim() ?? ''
}

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-zA-Z#\d]+;/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

// ── HubPage ────────────────────────────────────────────────────────────────

export default function HubPage() {
  const { isAuthenticated } = useAuth()
  const { t, lang } = useLang()

  const [news,        setNews]        = useState([])
  const [newsLoading, setNewsLoading] = useState(true)

  useEffect(() => {
    setNewsLoading(true)
    fetch(feedUrl(lang))
      .then(r => r.text())
      .then(xml => {
        const doc   = new DOMParser().parseFromString(xml, 'text/xml')
        const items = [...doc.querySelectorAll('item')].slice(0, 4)
        setNews(items.map(item => {
          const raw     = stripHtml(getText(item, 'description'))
          const excerpt = raw.slice(0, 150) + (raw.length > 150 ? '…' : '')
          return {
            id:        getText(item, 'guid') || getText(item, 'link'),
            title:     getText(item, 'title'),
            date:      formatDate(getText(item, 'pubDate')),
            excerpt,
            link:      getText(item, 'link'),
            thumbnail: item.querySelector('enclosure')?.getAttribute('url') ?? null,
          }
        }))
      })
      .catch(() => {})
      .finally(() => setNewsLoading(false))
  }, [lang])

  const HUB_FEATURES = [
    { to: '/profile', icon: '⚔️', key: 'featureProfile', color: '#c9a84c', ready: true  },
    { to: '/records', icon: '🏆', key: 'featureRanking', color: '#60a5fa', ready: true  },
    { to: '/market',  icon: '💰', key: 'featureMarket',  color: '#4caf9a', ready: true },
    { to: '/guild',   icon: '🛡️', key: 'featureGuild',   color: '#7c6ce0', ready: false },
    { to: '/raids',   icon: '🏰', key: 'featureRaids',   color: '#e06c5a', ready: true  },
    { to: '/events',  icon: '🌟', key: 'featureEvents',  color: '#c084fc', ready: false },
  ]

  return (
    <div className={styles.page}>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>{t('hub.badge')}</div>
        <h1 className={styles.heroTitle}>
          <span className={styles.heroTitleWhite}>Nos</span>Book
        </h1>
        <p className={styles.heroSub}>
          {t('hub.heroSub').split('\n').map((line, i) => (
            <span key={i}>{line}{i === 0 && <br />}</span>
          ))}
        </p>
        <div className={styles.heroActions}>
          {isAuthenticated ? (
            <Link to="/profile">
              <Button variant="solid" size="lg">{t('hub.myProfile')}</Button>
            </Link>
          ) : (
            <>
              <Link to="/auth?mode=register">
                <Button variant="solid" size="lg">{t('hub.startAdventure')}</Button>
              </Link>
              <Link to="/auth?mode=login">
                <Button variant="primary" size="lg">{t('hub.signIn')}</Button>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features grid */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('hub.features')}</h2>
        <div className={styles.featuresGrid}>
          {HUB_FEATURES.map(({ to, icon, key, color, ready }) => (
            <Link
              key={key}
              to={ready ? to : '#'}
              className={`${styles.featureCard} ${!ready ? styles.featureSoon : ''}`}
              style={{ '--accent': color }}
              onClick={!ready ? (e) => e.preventDefault() : undefined}
            >
              <div className={styles.featureIcon}>{icon}</div>
              <div className={styles.featureBody}>
                <div className={styles.featureLabel}>
                  {t(`hub.${key}.label`)}
                  {!ready && <span className={styles.soonBadge}>{t('hub.comingSoon')}</span>}
                </div>
                <div className={styles.featureDesc}>{t(`hub.${key}.desc`)}</div>
              </div>
              <div className={styles.featureArrow}>→</div>
            </Link>
          ))}
        </div>
      </section>

      {/* News */}
      <section>
        <Card title={t('hub.news')}>
          <div className={styles.newsList}>
            {newsLoading ? (
              <div className={styles.newsLoading}>{t('hub.newsLoading')}</div>
            ) : news.length === 0 ? (
              <div className={styles.newsEmpty}>{t('hub.newsEmpty')}</div>
            ) : (
              news.map(n => (
                <div key={n.id} className={styles.newsItem}>
                  {n.thumbnail && (
                    <img src={n.thumbnail} alt="" className={styles.newsThumb} />
                  )}
                  <div className={styles.newsContent}>
                    <div className={styles.newsTop}>
                      <span className={styles.newsTag} style={{ color: '#c9a84c', borderColor: '#c9a84c44' }}>
                        Steam
                      </span>
                      <span className={styles.newsDate}>{n.date}</span>
                    </div>
                    <a
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.newsTitle}
                    >
                      {n.title}
                    </a>
                    {n.excerpt && <div className={styles.newsExcerpt}>{n.excerpt}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

    </div>
  )
}
