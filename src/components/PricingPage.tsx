import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Zap, Crown, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSubscription } from '@/contexts/SubscriptionContext'
import toast from 'react-hot-toast'

interface PricingTier {
  id: string
  name: string
  icon: React.ReactNode
  price: number
  period: string
  description: string
  features: string[]
  popular?: boolean
  cta: string
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    icon: <Zap className="w-6 h-6" />,
    price: 0,
    period: 'forever',
    description: 'Perfect for trying out AutoPay Vault',
    features: [
      '3 active subscriptions',
      'Basic wallet connection',
      'Community support',
      'Standard transaction speed'
    ],
    cta: 'Get Started'
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: <Star className="w-6 h-6" />,
    price: 10,
    period: 'month',
    description: 'For power users and small teams',
    features: [
      '50 active subscriptions',
      'Advanced analytics',
      'Email notifications',
      'Priority transaction processing',
      'API access',
      'Priority support'
    ],
    popular: true,
    cta: 'Upgrade to Pro'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: <Crown className="w-6 h-6" />,
    price: 50,
    period: 'month',
    description: 'For large organizations and businesses',
    features: [
      'Unlimited subscriptions',
      'Advanced analytics & reporting',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      '24/7 priority support',
      'Custom contract features',
      'Bulk operations'
    ],
    cta: 'Contact Sales'
  }
]

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  tier: PricingTier
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, tier }) => {
  const [months, setMonths] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const { subscribe } = useSubscription()

  const handleSubscribe = async () => {
    setIsLoading(true)
    try {
      await subscribe(months)
      toast.success(`Successfully subscribed to ${tier.name} for ${months} month${months > 1 ? 's' : ''}!`)
      onClose()
    } catch (error) {
      console.error('Subscription error:', error)
      toast.error(error instanceof Error ? error.message : 'Subscription failed')
    } finally {
      setIsLoading(false)
    }
  }

  const totalCost = tier.price * months
  const savings = months >= 12 ? Math.round(totalCost * 0.2) : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              {tier.icon}
              Subscribe to {tier.name}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">
              ${totalCost}
              {savings > 0 && (
                <span className="ml-2 text-sm text-green-600 font-normal">
                  Save ${savings}
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {months} month{months > 1 ? 's' : ''} of {tier.name}
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 6, 12].map((duration) => (
                <Button
                  key={duration}
                  variant={months === duration ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMonths(duration)}
                  className="relative"
                >
                  {duration}m
                  {duration === 12 && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 rounded-full">
                      20%
                    </span>
                  )}
                </Button>
              ))}
            </div>
            {months >= 12 && (
              <p className="text-sm text-green-600">
                🎉 20% discount applied for annual subscription!
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Payment will be made in USDC on Base network
            </p>
            <ul className="text-sm space-y-1">
              <li>• First, approve USDC spending</li>
              <li>• Then complete subscription payment</li>
              <li>• Access unlocked immediately</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubscribe}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              ) : null}
              {isLoading ? 'Processing...' : 'Subscribe'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const PricingPage = () => {
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null)
  const { currentPlan, isActive } = useSubscription()

  const handleTierSelect = (tier: PricingTier) => {
    if (tier.id === 'free') {
      toast.success('You\'re already on the free plan!')
      return
    }
    
    if (tier.id === 'enterprise') {
      window.open('mailto:sales@autopayvault.com?subject=Enterprise%20Plan%20Inquiry', '_blank')
      return
    }

    setSelectedTier(tier)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock the full power of AutoPay Vault with our flexible pricing plans
          </p>
          {isActive && (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
              <Check className="w-4 h-4" />
              Currently on {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan
            </div>
          )}
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PRICING_TIERS.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="relative"
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <Card className={`h-full glass ${tier.popular ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="text-center pb-8">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    {tier.icon}
                  </div>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      ${tier.price}
                    </span>
                    <span className="text-muted-foreground">
                      /{tier.period}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-2">
                    {tier.description}
                  </p>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={() => handleTierSelect(tier)}
                      className="w-full"
                      variant={tier.popular ? 'default' : 'outline'}
                      size="lg"
                      disabled={currentPlan === tier.id && isActive}
                    >
                      {currentPlan === tier.id && isActive ? 'Current Plan' : tier.cta}
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground mb-4">
            All plans include our core features and 30-day money-back guarantee
          </p>
          <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
            <span>✓ Base Network</span>
            <span>✓ USDC Payments</span>
            <span>✓ No Setup Fees</span>
            <span>✓ Cancel Anytime</span>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedTier && (
          <SubscriptionModal
            isOpen={!!selectedTier}
            onClose={() => setSelectedTier(null)}
            tier={selectedTier}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
