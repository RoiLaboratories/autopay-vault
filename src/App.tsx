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
  const { wallets } = useWallets();
  const connectedWallet = wallets[0] || null;
  return (
    <Router>
      <SubscriptionProvider>
        <Routes>
          <Route path="/subscribe/:planId" element={<SubscriptionPage privyWallet={connectedWallet} />} />
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
  // All hooks must be at the top, before any logic or return
  const [currentPage, setCurrentPage] = useState<AppState>('landing');
  const privy = usePrivy() as any;
  const ready = privy.ready;
  const login = privy.login;
  const logout = privy.logout;
  const user = privy.user;
  const link = privy.link;
  const { wallets } = useWallets();
  // Select the first EVM-compatible wallet (MetaMask, WalletConnect, Coinbase, etc.) that is NOT the embedded Privy wallet
  const evmWallet = wallets.find((w: any) =>
    w.walletClientType !== 'privy' &&
    typeof w.getEip1193Provider === 'function' &&
    w.getEip1193Provider?.()
  ) || null;
  // Fallback: use embedded Privy wallet if no EVM wallet is present
  const embeddedWallet = wallets.find((w: any) => w.walletClientType === 'privy') || null;
  const activeWallet = evmWallet || embeddedWallet;
  const isConnected = !!activeWallet;
  const address = activeWallet?.address || null;

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
    if (currentPage === 'wallet' && isConnected && address) {
      setCurrentPage('dashboard');
    }
  }, [currentPage, isConnected, address])

  // Handle wallet disconnection - redirect to landing if on a protected page
  useEffect(() => {
    let didLogout = false;
    if (!isConnected && (currentPage === 'dashboard' || currentPage === 'create') && user && typeof logout === 'function') {
      (async () => {
        if (!didLogout) {
          console.log('Wallet disconnected, redirecting to landing and logging out')
          didLogout = true;
          await logout();
          setCurrentPage('landing');
        }
      })();
    }
    // No cleanup needed
  }, [isConnected, currentPage, logout, user])

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

  // Only render after all hooks
  if (!ready) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  // Helper to open Privy modal as needed
  const handleConnectWallet = () => {
    if (!user) {
      login();
    } else if (typeof link === 'function') {
      link();
    }
  };

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
                <div className="bg-background/90 rounded-2xl shadow-xl border border-border p-8 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                    <Wallet className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                  <p className="text-muted-foreground mb-6 text-center">
                    Securely connect your wallet to manage subscriptions and payments.
                  </p>
                  <Button onClick={handleConnectWallet} className="w-full" size="lg">
                    <Wallet className="w-5 h-5 mr-2" />
                    Connect Wallet
                  </Button>
                </div>
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
                <CompanyDashboard privyWallet={activeWallet} />
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
