import { motion } from 'framer-motion'
import { Wallet, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/hooks/useWallet'

export const WalletConnect = () => {
  const { isConnected, address, isLoading, error, connectWallet, disconnectWallet } = useWallet()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isConnected && address) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 glass rounded-lg p-3"
      >
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{formatAddress(address)}</span>
          <span className="text-xs text-muted-foreground">Connected</span>
        </div>
        <Button
          onClick={disconnectWallet}
          variant="ghost"
          size="sm"
          className="ml-2"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-4"
    >
      <div className="glass rounded-xl p-8">
        <Wallet className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-muted-foreground mb-6">
          Connect your Coinbase Wallet to start managing your subscriptions
        </p>
        
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        
        <Button
          onClick={connectWallet}
          disabled={isLoading}
          size="lg"
          className="group"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Wallet className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
          )}
          {isLoading ? 'Connecting...' : 'Connect Coinbase Wallet'}
        </Button>
      </div>
    </motion.div>
  )
}
