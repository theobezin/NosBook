import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { LangProvider } from '@/i18n'
import PageLayout   from '@/components/layout/PageLayout'
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
import NotFoundPage      from '@/pages/NotFoundPage'

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
          <Route path="/auth"            element={withLayout(AuthPage)}          />
          <Route path="*"                element={withLayout(NotFoundPage)}      />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </LangProvider>
  )
}
