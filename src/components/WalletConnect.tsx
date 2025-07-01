import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const WalletConnect = () => {
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
          Please use the main Connect Wallet button to connect via Privy.
        </p>
        <Button disabled size="lg" className="group opacity-50 cursor-not-allowed">
          <Wallet className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
          Connect Wallet (Disabled)
        </Button>
      </div>
    </motion.div>
  )
}
