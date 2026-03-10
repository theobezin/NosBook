import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { LangProvider } from '@/i18n'
import PageLayout        from '@/components/layout/PageLayout'
import HubPage           from '@/pages/HubPage'
import ProfilePage       from '@/pages/ProfilePage'
import PlayersPage       from '@/pages/PlayersPage'
import PlayerProfilePage from '@/pages/PlayerProfilePage'
import AuthPage          from '@/pages/AuthPage'
import NotFoundPage      from '@/pages/NotFoundPage'
import MarketPage        from '@/pages/MarketPage'
import AdminMarketPage   from '@/pages/AdminMarketPage'

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
          <Route path="/auth"            element={withLayout(AuthPage)}          />
          <Route path="/market"          element={withLayout(MarketPage)}        />
          <Route path="/admin/market"    element={withLayout(AdminMarketPage)}   />
          <Route path="*"               element={withLayout(NotFoundPage)}      />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </LangProvider>
  )
}
