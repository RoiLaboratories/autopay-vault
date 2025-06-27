import { type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Crown, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSubscription, type PlanTier } from '@/contexts/SubscriptionContext'

interface FeatureGateProps {
  feature: string
  requiredPlan?: PlanTier
  fallback?: ReactNode
  children: ReactNode
}

interface UpgradePromptProps {
  feature: string
  requiredPlan: PlanTier
  onUpgrade: () => void
}

const PLAN_ICONS: Record<PlanTier, ReactNode> = {
  free: <Zap className="w-5 h-5" />,
  pro: <Crown className="w-5 h-5" />,
  enterprise: <Crown className="w-5 h-5 text-purple-500" />
}

const PLAN_COLORS: Record<PlanTier, string> = {
  free: 'text-blue-500',
  pro: 'text-amber-500',
  enterprise: 'text-purple-500'
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ feature, requiredPlan, onUpgrade }) => {
  const planName = requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-10"
    >
      <Card className="max-w-md w-full glass">
        <CardContent className="p-6 text-center">
          <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center ${PLAN_COLORS[requiredPlan]}`}>
            <Lock className="w-8 h-8" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">
            {planName} Feature Required
          </h3>
          
          <p className="text-muted-foreground mb-4">
            The "{feature}" feature requires a {planName} subscription. Upgrade now to unlock advanced capabilities.
          </p>
          
          <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground">
            {PLAN_ICONS[requiredPlan]}
            <span>{planName} Plan</span>
          </div>
          
          <Button onClick={onUpgrade} className="w-full">
            Upgrade to {planName}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  feature, 
  requiredPlan = 'pro', 
  fallback, 
  children 
}) => {
  const { canAccessFeature } = useSubscription()
  
  const hasAccess = canAccessFeature(feature)
  
  const handleUpgrade = () => {
    // Since we're using state-based navigation, we'll need to pass this up
    // or use a global event system. For now, just show a toast
    window.dispatchEvent(new CustomEvent('navigate-to-pricing'))
  }
  
  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }
  
  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {!hasAccess && (
          <UpgradePrompt
            feature={feature}
            requiredPlan={requiredPlan}
            onUpgrade={handleUpgrade}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Limit Gate for checking subscription/client limits
interface LimitGateProps {
  limitType: 'subscriptions' | 'clients'
  current: number
  fallback?: ReactNode
  children: ReactNode
}

export const LimitGate: React.FC<LimitGateProps> = ({ 
  limitType, 
  current, 
  fallback, 
  children 
}) => {
  const { planLimits } = useSubscription()
  
  const limit = limitType === 'subscriptions' 
    ? planLimits.maxSubscriptions 
    : planLimits.maxClients
  
  const isAtLimit = limit !== -1 && current >= limit
  
  const handleUpgrade = () => {
    window.dispatchEvent(new CustomEvent('navigate-to-pricing'))
  }
  
  if (!isAtLimit) {
    return <>{children}</>
  }
  
  if (fallback) {
    return <>{fallback}</>
  }
  
  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 z-10"
        >
          <Card className="max-w-md w-full glass">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-500/20 to-amber-500/10 rounded-full flex items-center justify-center text-amber-500">
                <Crown className="w-8 h-8" />
              </div>
              
              <h3 className="text-lg font-semibold mb-2">
                Limit Reached
              </h3>
              
              <p className="text-muted-foreground mb-4">
                You've reached your {limitType} limit of {limit}. 
                Upgrade to increase your limits.
              </p>
              
              <div className="bg-muted rounded-lg p-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Current usage:</span>
                  <span className="font-medium">{current} / {limit}</span>
                </div>
                <div className="w-full bg-background rounded-full h-2 mt-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full"
                    style={{ width: `${Math.min((current / limit) * 100, 100)}%` }}
                  />
                </div>
              </div>
              
              <Button onClick={handleUpgrade} className="w-full">
                Upgrade Plan
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// Plan Badge Component
export const PlanBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { currentPlan, isActive } = useSubscription()
  
  const planName = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)
  const badgeColor = isActive 
    ? PLAN_COLORS[currentPlan] 
    : 'text-muted-foreground'
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 text-xs font-medium ${badgeColor} ${className}`}
    >
      {PLAN_ICONS[currentPlan]}
      <span>{planName}</span>
      {!isActive && currentPlan !== 'free' && (
        <span className="text-red-500">(Expired)</span>
      )}
    </motion.div>
  )
}
