import { motion } from 'framer-motion'
import { Shield, Zap, Users, CreditCard, BarChart3, Building2, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

          {/* AutoPay Vault Features */}
          <Card className="relative overflow-hidden mt-12 mb-12">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center justify-center space-x-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                >
                  <DollarSign className="w-4 h-4 text-white" />
                </motion.div>
                <span>AutoPay Vault Features</span>
              </CardTitle>
              <CardDescription className="text-center">Powerful tools for subscription management</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    transition: { duration: 0.2 }
                  }}
                  transition={{ delay: 0.1 }}
                  className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-green-200 dark:border-green-800 cursor-pointer hover:bg-green-50/50 dark:hover:bg-green-950/20 hover:border-green-300 dark:hover:border-green-700 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <motion.div 
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"
                    >
                      <CreditCard className="w-4 h-4 text-green-600" />
                    </motion.div>
                    <h3 className="font-semibold">Automated Payments</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Set up recurring USDC payments with smart contract automation for reliable subscription billing.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    transition: { duration: 0.2 }
                  }}
                  transition={{ delay: 0.2 }}
                  className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-50/50 dark:hover:bg-purple-950/20 hover:border-purple-300 dark:hover:border-purple-700 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <motion.div 
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                      className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center"
                    >
                      <Users className="w-4 h-4 text-purple-600" />
                    </motion.div>
                    <h3 className="font-semibold">Client Management</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Track subscriber activity, manage plans, and analyze revenue streams with comprehensive analytics.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    transition: { duration: 0.2 }
                  }}
                  transition={{ delay: 0.3 }}
                  className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-orange-200 dark:border-orange-800 cursor-pointer hover:bg-orange-50/50 dark:hover:bg-orange-950/20 hover:border-orange-300 dark:hover:border-orange-700 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <motion.div 
                      whileHover={{ 
                        rotateY: 180,
                        transition: { duration: 0.5 }
                      }}
                      className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center"
                    >
                      <BarChart3 className="w-4 h-4 text-orange-600" />
                    </motion.div>
                    <h3 className="font-semibold">Real-time Analytics</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Monitor subscription metrics, revenue trends, and client engagement with live dashboard updates.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    transition: { duration: 0.2 }
                  }}
                  transition={{ delay: 0.4 }}
                  className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <motion.div 
                      whileHover={{ 
                        scale: [1, 1.2, 1],
                        transition: { duration: 0.3 }
                      }}
                      className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center"
                    >
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </motion.div>
                    <h3 className="font-semibold">Enterprise Ready</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Built on Base blockchain with secure smart contracts and enterprise-grade reliability.
                  </p>
                </motion.div>
              </div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-dashed border-blue-300 dark:border-blue-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Ready to Get Started?</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Join the future of automated subscription billing
                    </p>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={onGetStarted}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/30"
                    >
                      Get Started Now
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            {/* <Button
              onClick={onGetStarted}
              size="lg"
              className="text-lg px-8 py-4 group"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button> */}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
