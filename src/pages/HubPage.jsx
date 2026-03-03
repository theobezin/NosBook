import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { mockHubStats, mockTopPlayers, CLASSES } from '@/lib/mockData'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import styles from './HubPage.module.css'

// ── RSS helpers ────────────────────────────────────────────────────────────

const STEAM_RSS = 'https://store.steampowered.com/feeds/news/app/550470'
const RSS_API   = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(STEAM_RSS)}&count=4`

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-zA-Z]+;/g, ' ').replace(/\s+/g, ' ').trim()
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
  const { t } = useLang()

  const [news,        setNews]        = useState([])
  const [newsLoading, setNewsLoading] = useState(true)

  useEffect(() => {
    fetch(RSS_API)
      .then(r => r.json())
      .then(({ status, items }) => {
        if (status === 'ok' && items?.length) {
          setNews(items.slice(0, 4).map(item => ({
            id:      item.guid || item.link,
            title:   item.title,
            date:    formatDate(item.pubDate),
            excerpt: stripHtml(item.description).slice(0, 150) + (stripHtml(item.description).length > 150 ? '…' : ''),
            link:    item.link,
          })))
        }
      })
      .catch(() => {})
      .finally(() => setNewsLoading(false))
  }, [])

  const HUB_FEATURES = [
    { to: '/profile', icon: '⚔️', key: 'featureProfile', color: '#c9a84c', ready: true  },
    { to: '/raids',   icon: '🏰', key: 'featureRaids',   color: '#e06c5a', ready: false },
    { to: '/market',  icon: '💰', key: 'featureMarket',  color: '#4caf9a', ready: false },
    { to: '/guild',   icon: '🛡️', key: 'featureGuild',   color: '#7c6ce0', ready: false },
    { to: '/ranking', icon: '🏆', key: 'featureRanking', color: '#60a5fa', ready: false },
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

        {/* Stats bar */}
        <div className={styles.statsBar}>
          {[
            { val: mockHubStats.players,   key: t('hub.players')   },
            { val: mockHubStats.guilds,    key: t('hub.guilds')    },
            { val: mockHubStats.raidsDone, key: t('hub.raidsDone') },
          ].map(({ val, key }) => (
            <div key={key} className={styles.statItem}>
              <span className={styles.statVal}>{val}</span>
              <span className={styles.statKey}>{key}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('hub.features')}</h2>
        <div className={styles.featuresGrid}>
          {HUB_FEATURES.map(({ to, icon, key, color, ready }) => (
            <Link
              key={to}
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

      {/* Bottom: News + Top players */}
      <div className={styles.bottomGrid}>

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
                ))
              )}
            </div>
          </Card>
        </section>

        <section>
          <Card title={t('hub.topPlayers')}>
            <div className={styles.topList}>
              {mockTopPlayers.map((p) => {
                const cls = CLASSES[p.class]
                return (
                  <div key={p.rank} className={styles.topItem}>
                    <span className={`${styles.rank} ${p.rank <= 3 ? styles.rankTop : ''}`}>
                      {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`}
                    </span>
                    <span className={styles.topIcon} style={{ color: cls.color }}>{cls.icon}</span>
                    <div className={styles.topInfo}>
                      <span className={styles.topName}>{p.name}</span>
                      <span className={styles.topMeta}>{p.server} · {t('hub.heroLevel')} {p.heroLevel}</span>
                    </div>
                    <span className={styles.topLevel}>{t('hub.lv')} {p.level}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        </section>

      </div>
    </div>
  )
}
