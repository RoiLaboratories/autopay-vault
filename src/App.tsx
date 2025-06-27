import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { LandingPage } from '@/components/LandingPage'
import { WalletConnect } from '@/components/WalletConnect'
import { SubscriptionForm } from '@/components/SubscriptionForm'
import { Dashboard } from '@/components/Dashboard'
import { PricingPage } from '@/components/PricingPage'
import { PlanBadge } from '@/components/FeatureGate'
import { useWallet } from '@/hooks/useWallet'
import { Button } from '@/components/ui/button'
import { Plus, LayoutDashboard, LogOut, Wallet, CreditCard, Building2 } from 'lucide-react'

type AppState = 'landing' | 'wallet' | 'dashboard' | 'create' | 'pricing' | 'company'

function App() {
  const [currentPage, setCurrentPage] = useState<AppState>('landing')
  const { isConnected, address, disconnectWallet } = useWallet()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleGetStarted = () => {
    if (isConnected) {
      setCurrentPage('dashboard')
    } else {
      setCurrentPage('wallet')
    }
  }

  const handleSubscriptionCreated = () => {
    setCurrentPage('dashboard')
    // The success toast is already handled in SubscriptionForm
  }

  const handleDisconnect = () => {
    disconnectWallet()
    setCurrentPage('landing')
    // The success toast is already handled in useWallet hook
  }

  // Auto-redirect to dashboard if wallet is connected
  if (currentPage === 'wallet' && isConnected) {
    setCurrentPage('dashboard')
  }

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
                variant={currentPage === 'create' ? 'secondary' : 'ghost'}
                onClick={() => setCurrentPage('create')}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create</span>
              </Button>
              <Button
                variant={currentPage === 'pricing' ? 'secondary' : 'ghost'}
                onClick={() => setCurrentPage('pricing')}
                className="flex items-center space-x-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pricing</span>
              </Button>
              <Button
                variant={currentPage === 'company' ? 'secondary' : 'ghost'}
                onClick={() => setCurrentPage('company')}
                className="flex items-center space-x-2"
              >
                <Building2 className="w-4 h-4" />
                <span>Company</span>
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
                variant={currentPage === 'create' ? 'secondary' : 'ghost'}
                onClick={() => setCurrentPage('create')}
                className="flex flex-col items-center justify-center space-y-1 py-2 h-auto"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs">Create</span>
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
              <Button
                variant={currentPage === 'company' ? 'secondary' : 'ghost'}
                onClick={() => setCurrentPage('company')}
                className="flex flex-col items-center justify-center space-y-1 py-2 h-auto"
                size="sm"
              >
                <Building2 className="w-4 h-4" />
                <span className="text-xs">Company</span>
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
                <WalletConnect />
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
              <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Dashboard />
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
                <SubscriptionForm onSuccess={handleSubscriptionCreated} />
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

          {currentPage === 'company' && isConnected && (
            <motion.div
              key="company"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center py-20">
                  <h1 className="text-3xl font-bold mb-4">Company Dashboard</h1>
                  <p className="text-muted-foreground">Coming soon...</p>
                </div>
              </main>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <SubscriptionProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
          },
          success: {
            iconTheme: {
              primary: 'hsl(var(--primary))',
              secondary: 'hsl(var(--primary-foreground))',
            },
          },
          error: {
            iconTheme: {
              primary: 'hsl(var(--destructive))',
              secondary: 'hsl(var(--destructive-foreground))',
            },
          },
        }}
      />
      {renderNavigation()}
      {renderContent()}
    </SubscriptionProvider>
  )
}

export default App
