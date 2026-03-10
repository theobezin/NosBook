// ============================================================
// MarketPage — main marketplace page
// Tabs: Listings (WTS) | Wanted (WTB) | My Listings
// Accessible from the Hub only (not in Navbar).
// ============================================================
import { useState, useMemo } from 'react'
import { useLang } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useCharacters } from '@/hooks/useCharacters'
import { useMarketListings, useMyListings, useFollowedListings, useMyFollows } from '@/hooks/useMarket'
import { MARKET_TAGS, LISTING_TYPES, SERVERS } from '@/lib/market'
import ListingCard         from '@/components/market/ListingCard'
import CreateListingModal  from '@/components/market/CreateListingModal'
import Spinner             from '@/components/ui/Spinner'
import styles from './MarketPage.module.css'

// ── Server label helper ────────────────────────────────────
const SERVER_LABEL = { undercity: 'Undercity', dragonveil: 'Dragonveil' }

// ── TagFilter ──────────────────────────────────────────────
function TagFilter({ selected, onChange, t }) {
  function toggle(slug) {
    onChange(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  return (
    <div className={styles.tagFilter}>
      <div className={styles.tagFilterHeader}>
        <span className={styles.tagFilterLabel}>{t('market.filterTags')}</span>
        {selected.length > 0 && (
          <button className={styles.clearTags} onClick={() => onChange([])}>
            {t('market.clearTags')}
          </button>
        )}
      </div>
      <div className={styles.tagGrid}>
        {MARKET_TAGS.map(tag => (
          <button
            key={tag.slug}
            className={`${styles.tagBtn} ${selected.includes(tag.slug) ? styles.tagActive : ''}`}
            onClick={() => toggle(tag.slug)}
          >
            {tag.icon} {t(`market.tags.${tag.slug}`)}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── ListingsGrid ───────────────────────────────────────────
function ListingsGrid({ listings, loading, error, onRefresh, userProfile, userCharServers, followedIds, onToggleFollow, t }) {
  if (loading) return <div className={styles.centered}><Spinner size="md" /></div>
  if (error)   return <div className={styles.errorMsg}>{error}</div>
  if (!listings.length) return <div className={styles.empty}>{t('market.noListings')}</div>

  return (
    <div className={styles.grid}>
      {listings.map(listing => (
        <ListingCard
          key={listing.id}
          listing={listing}
          onRefresh={onRefresh}
          userProfile={userProfile}
          userCharServers={userCharServers}
          isFollowed={followedIds?.has(listing.id) ?? false}
          onToggleFollow={onToggleFollow}
        />
      ))}
    </div>
  )
}

// ── MarketPage ─────────────────────────────────────────────
export default function MarketPage() {
  const { t }  = useLang()
  const { user, isAuthenticated } = useAuth()

  // Profile + characters for server eligibility checks
  const { profile }    = useProfile(user?.id)
  const { characters } = useCharacters()

  const [tab,            setTab]            = useState('sell')
  const [mineStatus,     setMineStatus]     = useState('active')   // 'active' | 'archived'
  const [serverFilter,   setServerFilter]   = useState('')
  const [selectedTags,   setSelectedTags]   = useState([])
  const [searchQuery,    setSearchQuery]    = useState('')
  const [showCreateSell, setShowCreateSell] = useState(false)
  const [showCreateBuy,  setShowCreateBuy]  = useState(false)

  // Filters shared between sell/buy tabs
  const sellFilters = useMemo(() => ({
    type:   LISTING_TYPES.SELL,
    server: serverFilter || undefined,
    tags:   selectedTags.length ? selectedTags : undefined,
    search: searchQuery.trim()  || undefined,
  }), [serverFilter, selectedTags, searchQuery])

  const buyFilters = useMemo(() => ({
    type:   LISTING_TYPES.BUY,
    server: serverFilter || undefined,
    tags:   selectedTags.length ? selectedTags : undefined,
    search: searchQuery.trim()  || undefined,
  }), [serverFilter, selectedTags, searchQuery])

  const { listings: sellListings,     loading: sellLoading,     error: sellError,     refetch: refetchSell     } = useMarketListings(sellFilters)
  const { listings: buyListings,      loading: buyLoading,      error: buyError,      refetch: refetchBuy      } = useMarketListings(buyFilters)
  const { listings: myListingsAll,    loading: myLoading,       error: myError,       refetch: refetchMy       } = useMyListings()
  const { listings: followedListings, loading: followedLoading, error: followedError, refetch: refetchFollowed } = useFollowedListings()
  const { followedIds, toggle: toggleFollow } = useMyFollows()

  // Sub-filter for "Mes annonces"
  const myListings = useMemo(
    () => myListingsAll.filter(l => l.status === mineStatus),
    [myListingsAll, mineStatus]
  )

  // Servers on which the user has at least one character (offer eligibility guard).
  const userCharServers = useMemo(() => {
    const fromChars = characters.map(c => c.server).filter(Boolean)
    if (fromChars.length) return [...new Set(fromChars)]
    if (profile?.server)  return [profile.server]
    return []
  }, [characters, profile?.server])

  // Server to use when creating a new listing (profile server)
  const userServer = profile?.server ?? ''

  function refetchAll() {
    refetchSell()
    refetchBuy()
    refetchMy()
    refetchFollowed()
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.gateBox}>
          <span className={styles.gateIcon}>🔒</span>
          <p>{t('market.loginRequired')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('market.title')}</h1>
          <p className={styles.sub}>{t('market.sub')}</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={`${styles.createBtn} ${styles.createSell}`}
            onClick={() => setShowCreateSell(true)}
          >
            🏷️ {t('market.tabSell').replace('+', '')} +
          </button>
          <button
            className={`${styles.createBtn} ${styles.createBuy}`}
            onClick={() => setShowCreateBuy(true)}
          >
            🔍 {t('market.tabBuy').replace('+', '')} +
          </button>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('market.searchPlaceholder')}
        />
        {searchQuery && (
          <button className={styles.searchClear} onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {/* Server filter */}
        <div className={styles.serverFilter}>
          <button
            className={`${styles.serverBtn} ${serverFilter === '' ? styles.serverActive : ''}`}
            onClick={() => setServerFilter('')}
          >
            {t('market.filterAllServers')}
          </button>
          {SERVERS.map(s => (
            <button
              key={s}
              className={`${styles.serverBtn} ${serverFilter === s ? styles.serverActive : ''}`}
              onClick={() => setServerFilter(serverFilter === s ? '' : s)}
            >
              {SERVER_LABEL[s]}
            </button>
          ))}
        </div>

        <TagFilter selected={selectedTags} onChange={setSelectedTags} t={t} />
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'sell' ? styles.tabActive : ''}`}
          onClick={() => setTab('sell')}
        >
          🏷️ {t('market.tabSell')}
        </button>
        <button
          className={`${styles.tab} ${tab === 'buy' ? styles.tabActive : ''}`}
          onClick={() => setTab('buy')}
        >
          🔍 {t('market.tabBuy')}
        </button>
        <button
          className={`${styles.tab} ${tab === 'mine' ? styles.tabActive : ''}`}
          onClick={() => setTab('mine')}
        >
          📋 {t('market.tabMine')}
          {myListingsAll.filter(l => l.status === 'active').length > 0 && (
            <span className={styles.myCount}>
              {myListingsAll.filter(l => l.status === 'active').length}
            </span>
          )}
        </button>
        <button
          className={`${styles.tab} ${tab === 'followed' ? styles.tabActive : ''}`}
          onClick={() => setTab('followed')}
        >
          ⭐ {t('market.tabFollowed')}
          {followedIds.size > 0 && (
            <span className={styles.myCount}>{followedIds.size}</span>
          )}
        </button>
      </div>

      {/* Content */}
      {tab === 'sell' && (
        <ListingsGrid
          listings={sellListings}
          loading={sellLoading}
          error={sellError}
          onRefresh={refetchAll}
          userProfile={profile}
          userCharServers={userCharServers}
          followedIds={followedIds}
          onToggleFollow={toggleFollow}
          t={t}
        />
      )}

      {tab === 'buy' && (
        <ListingsGrid
          listings={buyListings}
          loading={buyLoading}
          error={buyError}
          onRefresh={refetchAll}
          userProfile={profile}
          userCharServers={userCharServers}
          followedIds={followedIds}
          onToggleFollow={toggleFollow}
          t={t}
        />
      )}

      {tab === 'mine' && (
        <>
          <div className={styles.subFilter}>
            <button
              className={`${styles.subFilterBtn} ${mineStatus === 'active' ? styles.subFilterActive : ''}`}
              onClick={() => setMineStatus('active')}
            >
              {t('market.tabMineActive')}
            </button>
            <button
              className={`${styles.subFilterBtn} ${mineStatus === 'archived' ? styles.subFilterActive : ''}`}
              onClick={() => setMineStatus('archived')}
            >
              {t('market.tabMineArchived')}
            </button>
          </div>
          <ListingsGrid
            listings={myListings}
            loading={myLoading}
            error={myError}
            onRefresh={refetchMy}
            userProfile={profile}
            userCharServers={userCharServers}
            followedIds={followedIds}
            onToggleFollow={toggleFollow}
            t={t}
          />
        </>
      )}

      {tab === 'followed' && (
        <ListingsGrid
          listings={followedListings}
          loading={followedLoading}
          error={followedError}
          onRefresh={refetchFollowed}
          userProfile={profile}
          userCharServers={userCharServers}
          followedIds={followedIds}
          onToggleFollow={toggleFollow}
          t={t}
        />
      )}

      {/* Modals */}
      {showCreateSell && (
        <CreateListingModal
          type={LISTING_TYPES.SELL}
          userServer={userServer}
          onClose={() => setShowCreateSell(false)}
          onSuccess={() => { setShowCreateSell(false); refetchAll() }}
        />
      )}

      {showCreateBuy && (
        <CreateListingModal
          type={LISTING_TYPES.BUY}
          userServer={userServer}
          onClose={() => setShowCreateBuy(false)}
          onSuccess={() => { setShowCreateBuy(false); refetchAll() }}
        />
      )}
    </div>
  )
}
