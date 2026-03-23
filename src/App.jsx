import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { LangProvider } from '@/i18n'
import PageLayout        from '@/components/layout/PageLayout'
import HubPage           from '@/pages/HubPage'
import ProfilePage       from '@/pages/ProfilePage'
import PlayersPage       from '@/pages/PlayersPage'
import PlayerProfilePage from '@/pages/PlayerProfilePage'
import RaidsPage         from '@/pages/RaidsPage'
import RaidSessionsPage      from '@/pages/RaidSessionsPage'
import RaidSessionDetailPage from '@/pages/RaidSessionDetailPage'
import AdminRaidsPage        from '@/pages/AdminRaidsPage'
import MySubmissionsPage    from '@/pages/MySubmissionsPage'
import NotificationsPage    from '@/pages/NotificationsPage'
import AuthPage             from '@/pages/AuthPage'
import ResetPasswordPage    from '@/pages/ResetPasswordPage'
import NotFoundPage      from '@/pages/NotFoundPage'
import PlannerPage       from '@/pages/PlannerPage'
import MarketPage          from '@/pages/MarketPage'
import ListingDetailPage  from '@/pages/ListingDetailPage'
import AdminMarketPage    from '@/pages/AdminMarketPage'
import AdminPlayersPage   from '@/pages/AdminPlayersPage'
import AdminHistoryPage   from '@/pages/AdminHistoryPage'
import FriendsPage        from '@/pages/FriendsPage'
import FamilyPage         from '@/pages/FamilyPage'
import FamiliesListPage   from '@/pages/FamiliesListPage'
import FamilyDetailPage from '@/pages/FamilyDetailPage'

function withLayout(Component) {
  return (
    <PageLayout>
      <Component />
    </PageLayout>
  )
}

export default function App() {
  return (
    <LangProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                element={withLayout(HubPage)}           />
          <Route path="/profile"         element={withLayout(ProfilePage)}       />
          <Route path="/players"         element={withLayout(PlayersPage)}       />
          <Route path="/players/:name"   element={withLayout(PlayerProfilePage)} />
          <Route path="/records"         element={withLayout(RaidsPage)}         />
          <Route path="/raids"           element={withLayout(RaidSessionsPage)}       />
          <Route path="/raids/:sessionId" element={withLayout(RaidSessionDetailPage)} />
          <Route path="/admin/raids"     element={withLayout(AdminRaidsPage)}    />
          <Route path="/submissions"     element={withLayout(MySubmissionsPage)} />
          <Route path="/notifications"   element={withLayout(NotificationsPage)} />
          <Route path="/auth"                  element={withLayout(AuthPage)}          />
          <Route path="/auth/reset-password"  element={withLayout(ResetPasswordPage)} />
          <Route path="/planner"         element={<PageLayout fullWidth><PlannerPage /></PageLayout>} />
          <Route path="/market"            element={withLayout(MarketPage)}          />
          <Route path="/market/:id"      element={withLayout(ListingDetailPage)} />
          <Route path="/admin/market"    element={withLayout(AdminMarketPage)}    />
          <Route path="/admin/players"   element={withLayout(AdminPlayersPage)}   />
          <Route path="/admin/history"   element={withLayout(AdminHistoryPage)}   />
          <Route path="/friends"         element={withLayout(FriendsPage)}        />
          <Route path="/family"          element={withLayout(FamilyPage)}         />
          <Route path="/families"        element={withLayout(FamiliesListPage)}    />
          <Route path="/families/:familyId" element={withLayout(FamilyDetailPage)} />
          <Route path="*"               element={withLayout(NotFoundPage)}      />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </LangProvider>
  )
}
