import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import MarketsPage from './pages/MarketsPage'
import BuyCryptoPage from './pages/BuyCryptoPage'
import P2PBuyPage from './pages/P2PBuyPage'
import P2PSellPage from './pages/P2PSellPage'
import DemoTradingPage from './pages/DemoTradingPage'
import MakeTradePage from './pages/MakeTradePage'
import OpenAccountPage from './pages/OpenAccountPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DepositCryptoPage from './pages/DepositCryptoPage'
import WithdrawCryptoPage from './pages/WithdrawCryptoPage'
import FeaturesPage from './pages/FeaturesPage'
import EarnPage from './pages/EarnPage'
import SecurityPage from './pages/SecurityPage'
import ApiPage from './pages/ApiPage'
import SpotTradingPage from './pages/SpotTradingPage'
import ProTradingPage from './pages/ProTradingPage'
import AdminWithdrawalsPage from './pages/AdminWithdrawalsPage'
import AdminKycPage from './pages/AdminKycPage'
import { AuthProvider } from './context/AuthContext'
import AuthGuard from './components/AuthGuard'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/buy-crypto" element={<BuyCryptoPage />} />
        <Route path="/p2p" element={<P2PBuyPage />} />
        <Route path="/p2p/sell" element={<P2PSellPage />} />
        <Route path="/demo-trading" element={<DemoTradingPage />} />
        <Route path="/demo-trading/trade" element={<MakeTradePage />} />
        <Route path="/open-account" element={<OpenAccountPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={<AuthGuard><DashboardPage /></AuthGuard>} />
        <Route path="/deposit" element={<AuthGuard><DepositCryptoPage /></AuthGuard>} />
        <Route path="/withdraw" element={<AuthGuard><WithdrawCryptoPage /></AuthGuard>} />
        <Route path="/admin/withdrawals" element={<AuthGuard><AdminWithdrawalsPage /></AuthGuard>} />
        <Route path="/admin/kyc" element={<AuthGuard><AdminKycPage /></AuthGuard>} />
        
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/earn" element={<EarnPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/api" element={<ApiPage />} />
        <Route path="/spot-trading" element={<AuthGuard><SpotTradingPage /></AuthGuard>} />
        <Route path="/pro-trading" element={<AuthGuard><ProTradingPage /></AuthGuard>} />
      </Routes>
    </AuthProvider>
  )
}

export default App
