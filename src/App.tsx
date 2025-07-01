import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { LandingPage } from '@/components/LandingPage'
// import { WalletConnect } from '@/components/WalletConnect'
import { BillingPlanForm } from '@/components/BillingPlanForm'
import { PricingPage } from '@/components/PricingPage'
import { SubscriptionPage } from '@/components/SubscriptionPage'
import { PlanBadge } from '@/components/FeatureGate'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, LogOut, Wallet, CreditCard } from 'lucide-react'
import { CompanyDashboard } from '@/components/CompanyDashboard'

type AppState = 'landing' | 'wallet' | 'dashboard' | 'create' | 'pricing'

function App() {
  return (
    <Router>
      <SubscriptionProvider>
        <Routes>
          <Route path="/subscribe/:planId" element={<SubscriptionPage />} />
          <Route path="/*" element={<MainApp />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
          }}
        />
      </SubscriptionProvider>
    </Router>
  )
}

function MainApp() {
  const [currentPage, setCurrentPage] = useState<AppState>('landing')
  const { ready, login, logout } = usePrivy() // removed 'user' since it's unused
  const { wallets } = useWallets()
  const connectedWallet = wallets[0] || null
  const isConnected = !!connectedWallet
  const address = connectedWallet?.address || null

  if (!ready) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  // Debug logging for state changes
  useEffect(() => {
    console.log('App state changed:', {
      currentPage,
      isConnected,
      address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null
    })
  }, [currentPage, isConnected, address])

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleGetStarted = () => {
    console.log('Get Started clicked:')
    console.log('- isConnected:', isConnected)
    console.log('- address:', address)
    console.log('- currentPage:', currentPage)
    
    // Always show wallet connect modal if not connected
    // This ensures fresh connection attempt after disconnect
    if (!isConnected || !address) {
      console.log('Navigating to wallet connect')
      setCurrentPage('wallet')
    } else {
      console.log('Navigating to dashboard')
      setCurrentPage('dashboard')
    }
  }

  const handleSubscriptionCreated = () => {
    setCurrentPage('dashboard')
    // The success toast is already handled in BillingPlanForm
  }

  const handleDisconnect = async () => {
    console.log('handleDisconnect called')
    await logout()
    console.log('Wallet disconnected, setting page to landing')
    setCurrentPage('landing')
    // The success toast is already handled in useWallet hook
  }

  // Auto-redirect to dashboard if wallet is connected and we're on the wallet page
  useEffect(() => {
    console.log('Navigation effect triggered:', { currentPage, isConnected, address })
    
    if (currentPage === 'wallet' && isConnected && address) {
      console.log('Auto-redirecting to dashboard after wallet connection')
      setCurrentPage('dashboard')
    }
  }, [currentPage, isConnected, address])

  // Handle wallet disconnection - redirect to landing if on a protected page
  useEffect(() => {
    if (!isConnected && (currentPage === 'dashboard' || currentPage === 'create')) {
      console.log('Wallet disconnected, redirecting to landing')
      setCurrentPage('landing')
    }
  }, [isConnected, currentPage])

  // Listen for navigation events from feature gates
  useEffect(() => {
    const handleNavigateToPricing = () => {
      setCurrentPage('pricing')
    }

    window.addEventListener('navigate-to-pricing', handleNavigateToPricing)
    return () => {
      window.removeEventListener('navigate-to-pricing', handleNavigateToPricing)
    }
  }, [])

  const renderNavigation = () => {
    if (!isConnected || currentPage === 'landing' || currentPage === 'wallet') {
      return null
    }

    return (
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold gradient-text">AutoPay Vault</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <Button
                variant={currentPage === 'dashboard' ? 'secondary' : 'ghost'}
                onClick={() => setCurrentPage('dashboard')}
                className="flex items-center space-x-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
              <Button
                variant={currentPage === 'pricing' ? 'secondary' : 'ghost'}
                onClick={() => setCurrentPage('pricing')}
                className="flex items-center space-x-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pricing</span>
              </Button>
            </nav>

            {/* Wallet Info */}
            <div className="flex items-center space-x-3">
              <PlanBadge />
              <div className="hidden sm:flex items-center space-x-3 glass rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{formatAddress(address!)}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden border-t border-border/40">
            <div className="grid grid-cols-4 gap-1 py-2">
              <Button
                variant={currentPage === 'dashboard' ? 'secondary' : 'ghost'}
                onClick={() => setCurrentPage('dashboard')}
                className="flex flex-col items-center justify-center space-y-1 py-2 h-auto"
                size="sm"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-xs">Dashboard</span>
              </Button>
              <Button
                variant={currentPage === 'pricing' ? 'secondary' : 'ghost'}
                onClick={() => setCurrentPage('pricing')}
                className="flex flex-col items-center justify-center space-y-1 py-2 h-auto"
                size="sm"
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-xs">Pricing</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.header>
    )
  }

  const renderContent = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <AnimatePresence mode="wait">
          {currentPage === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <LandingPage onGetStarted={handleGetStarted} />
            </motion.div>
          )}

          {currentPage === 'wallet' && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="min-h-screen flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md">
                {/* Use Privy login button */}
                <Button onClick={login} className="w-full" size="lg">Connect Wallet</Button>
              </div>
            </motion.div>
          )}

          {currentPage === 'dashboard' && isConnected && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <CompanyDashboard />
              </main>
            </motion.div>
          )}

          {currentPage === 'create' && isConnected && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <BillingPlanForm onSuccess={handleSubscriptionCreated} />
              </main>
            </motion.div>
          )}

          {currentPage === 'pricing' && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <PricingPage />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <>
      {renderNavigation()}
      {renderContent()}
    </>
  )
}

export default App
