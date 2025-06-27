import { motion } from 'framer-motion'
import { ArrowRight, Shield, Zap, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LandingPageProps {
  onGetStarted: () => void
}

export const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          {/* Hero Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Shield className="w-12 h-12 text-primary" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-accent-foreground" />
              </div>
            </div>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-6xl md:text-8xl font-bold gradient-text"
          >
            AutoPay Vault
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto"
          >
            Your autonomous crypto subscription agent. Set it once, forget it forever.
          </motion.p>

          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="grid md:grid-cols-3 gap-6 mt-12 mb-12"
          >
            <motion.div
              whileHover={{ 
                scale: 1.05,
                rotateY: 5,
                z: 50
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 20 
              }}
              className="glass rounded-xl p-6 hover:bg-primary/10 transition-all duration-300 cursor-pointer group relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Clock className="w-8 h-8 text-primary mb-4 mx-auto" />
              </motion.div>
              <motion.h3 
                className="text-lg font-semibold mb-2"
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                Automated Payments
              </motion.h3>
              <motion.p 
                className="text-sm text-muted-foreground"
                whileHover={{ y: -1 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.05 }}
              >
                Schedule recurring crypto payments with precision timing
              </motion.p>
            </motion.div>

            <motion.div
              whileHover={{ 
                scale: 1.05,
                rotateY: -5,
                z: 50
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 20 
              }}
              className="glass rounded-xl p-6 hover:bg-primary/10 transition-all duration-300 cursor-pointer group relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6, delay: 0.1 }}
              />
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Shield className="w-8 h-8 text-primary mb-4 mx-auto" />
              </motion.div>
              <motion.h3 
                className="text-lg font-semibold mb-2"
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                Secure & Reliable
              </motion.h3>
              <motion.p 
                className="text-sm text-muted-foreground"
                whileHover={{ y: -1 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.05 }}
              >
                Built with enterprise-grade security and fail-safe mechanisms
              </motion.p>
            </motion.div>

            <motion.div
              whileHover={{ 
                scale: 1.05,
                rotateY: 5,
                z: 50
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 20 
              }}
              className="glass rounded-xl p-6 hover:bg-primary/10 transition-all duration-300 cursor-pointer group relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6, delay: 0.2 }}
              />
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Zap className="w-8 h-8 text-primary mb-4 mx-auto" />
              </motion.div>
              <motion.h3 
                className="text-lg font-semibold mb-2"
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                Lightning Fast
              </motion.h3>
              <motion.p 
                className="text-sm text-muted-foreground"
                whileHover={{ y: -1 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.05 }}
              >
                Execute payments instantly when conditions are met
              </motion.p>
            </motion.div>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            <Button
              onClick={onGetStarted}
              size="lg"
              className="text-lg px-8 py-4 group"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
