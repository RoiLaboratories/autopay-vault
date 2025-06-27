import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { LandingPage } from '@/components/LandingPage'
import { WalletConnect } from '@/components/WalletConnect'
import { SubscriptionForm } from '@/components/SubscriptionForm'
import { Dashboard } from '@/components/Dashboard'
import { useWallet } from '@/hooks/useWallet'
import { Button } from '@/components/ui/button'
import { Plus, LayoutDashboard, LogOut, Wallet } from 'lucide-react'

type AppState = 'landing' | 'wallet' | 'dashboard' | 'create'

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
            </nav>

            {/* Wallet Info */}
            <div className="flex items-center space-x-3">
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
            <div className="flex space-x-1 py-2">
              <Button
                variant={currentPage === 'dashboard' ? 'secondary' : 'ghost'}
                onClick={() => setCurrentPage('dashboard')}
                className="flex-1 flex items-center justify-center space-x-2 py-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
              <Button
                variant={currentPage === 'create' ? 'secondary' : 'ghost'}
                onClick={() => setCurrentPage('create')}
                className="flex-1 flex items-center justify-center space-x-2 py-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create</span>
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
        </AnimatePresence>
      </div>
    )
  }

  return (
    <>
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
    </>
  )
}

export default App
