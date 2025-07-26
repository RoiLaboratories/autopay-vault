import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Copy, 
  Edit, 
  Trash2, 
  ExternalLink,
  DollarSign,
  Calendar,
  Wallet,
  CreditCard,
  PlayCircle,
  Zap,
  ZapOff,
  Crown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BillingPlanModal } from './BillingPlanModal'
import { toast } from 'react-hot-toast'
import { billingPlanService } from '@/services/BillingPlanService'
import { automaticPaymentService } from '@/services/AutomaticPaymentService'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useWallet } from '@/hooks/useWallet'
import { BrowserProvider } from 'ethers'

export interface BillingPlan {
  id: string
  plan_id: string
  name: string
  amount: number
  interval: 'monthly' | 'yearly'
  recipient_wallet: string
  creator_address: string
  created_at: string
  is_active: boolean
  description?: string
  max_subscribers?: number
  contract_plan_id?: string
}

export const BillingPlans: React.FC = () => {
  const { userTier } = useSubscription();
  const { ethereum, address, isConnected } = useWallet();
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<any>(null);
  const [automaticPaymentsEnabled, setAutomaticPaymentsEnabled] = useState<Set<string>>(new Set())

  useEffect(() => {
    console.log('BillingPlans: ethereum provider', ethereum);
    if (ethereum && isConnected) {
      setProvider(new BrowserProvider(ethereum));
    } else {
      setProvider(null);
      console.warn('No ethereum provider found or wallet not connected.');
    }
  }, [ethereum, isConnected])

  // Plan limits based on user tier
  const getPlanLimits = () => {
    switch (userTier) {
      case 'free': return 3
      case 'pro': return 50
      case 'enterprise': return Infinity
      default: return 3
    }
  }

  // Load plans from backend API
  useEffect(() => {
    if (address) {
      loadPlans()
    }
  }, [address])

  // Initialize contract service
  useEffect(() => {
    if (provider) {
      billingPlanService.initialize(provider)
    }
  }, [provider])

  // Cleanup automatic payments when component unmounts
  useEffect(() => {
    return () => {
      automaticPaymentService.stopAllAutomaticPayments()
    }
  }, [])

  const loadPlans = async () => {
    if (!address) return

    try {
      setLoading(true)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/billing-plans?creatorAddress=${address}`)
      const data = await response.json()
      
      console.log('API Response:', data) // Debug log
      
      if (response.ok) {
        console.log('Plans loaded:', data.plans) // Debug log
        setPlans(data.plans || [])
      } else {
        console.error('Failed to load plans:', data.error)
        toast.error('Failed to load billing plans')
        setPlans([])
      }
    } catch (error) {
      console.error('Error loading plans:', error)
      toast.error('Failed to load billing plans')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlan = async (planData: Omit<BillingPlan, 'id' | 'plan_id' | 'created_at' | 'creator_address' | 'is_active'>) => {
    const planLimit = getPlanLimits()
    if (!provider) {
      toast.error('Please connect your wallet before creating a plan.')
      return
    }
    if ((plans || []).length >= planLimit) {
      toast.error(`Plan limit exceeded. ${userTier === 'free' ? 'Upgrade to Pro' : 'Contact support'} for more plans.`)
      return
    }

    try {
      setLoading(true)
      
      const planId = `plan_${Date.now()}`

      // 1. Create plan on-chain first
      if (!provider) throw new Error('Wallet provider not found')
      await billingPlanService.initialize(provider)
      await billingPlanService.createPlan(
        planId,
        planData.name,
        planData.amount,
        planData.interval,
        planData.recipient_wallet
      )
      toast.success('Plan created on-chain!')

      // 2. Then create plan in backend/database
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/billing-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          name: planData.name,
          amount: planData.amount,
          interval: planData.interval,
          recipientWallet: planData.recipient_wallet,
          creatorAddress: address,
          description: planData.description || '',
          userTier
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh plans list
        await loadPlans()
        toast.success('Billing plan created successfully!')
        setIsModalOpen(false)
      } else {
        toast.error(data.error || 'Failed to create plan')
      }
    } catch (error) {
      console.error('Error creating plan:', error)
      toast.error('Failed to create plan')
    } finally {
      setLoading(false)
    }
  }

  const handleEditPlan = async (planData: Omit<BillingPlan, 'id' | 'plan_id' | 'created_at' | 'creator_address' | 'is_active'>) => {
    if (!editingPlan) return
    if (!provider) {
      toast.error('Please connect your wallet before updating a plan.')
      return
    }

    try {
      setLoading(true)

      // 1. Update plan on-chain first (just like in handleCreatePlan)
      if (!provider) throw new Error('Wallet provider not found')
      await billingPlanService.initialize(provider)
      await billingPlanService.updatePlan(
        editingPlan.plan_id,
        planData.name,
        planData.amount,
        planData.recipient_wallet
      )
      toast.success('Plan updated on-chain!')

      // 2. Then update plan in backend/database
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/billing-plans`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: editingPlan.plan_id,
          name: planData.name,
          amount: planData.amount,
          recipientWallet: planData.recipient_wallet,
          creatorAddress: address, // Use address from context, not planData
          description: planData.description
        }),
      })
      console.log('handleEditPlan payload:', {
        planId: editingPlan.plan_id,
        name: planData.name,
        amount: planData.amount,
        recipientWallet: planData.recipient_wallet,
        creatorAddress: address,
        description: planData.description
      }) // Debug log

      const data = await response.json()

      if (!response.ok) {
        console.error('Backend error:', data.error); // Log backend error message
      }

      if (response.ok) {
        await loadPlans()
        toast.success('Billing plan updated successfully!')
        setEditingPlan(null)
        setIsModalOpen(false)
      } else {
        toast.error(data.error || 'Failed to update plan')
      }
    } catch (error) {
      console.error('Error updating plan:', error)
      toast.error('Failed to update plan')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePlan = async (planId: string) => {
    try {
      setLoading(true)

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/billing-plans?planId=${planId}&creatorAddress=${address}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadPlans()
        toast.success('Billing plan deleted successfully!')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete plan')
      }
    } catch (error) {
      console.error('Error deleting plan:', error)
      toast.error('Failed to delete plan')
    } finally {
      setLoading(false)
    }
  }

  const handleProcessPayments = async (planId: string) => {
    if (!provider) {
      toast.error('Please connect your wallet to process payments.')
      return
    }

    try {
      setLoading(true)
      
      // Initialize billing service
      await billingPlanService.initialize(provider)
      
      // Get plan subscriptions to check for due payments
      let subscriptions: any[] = []
      try {
        subscriptions = await billingPlanService.getPlanSubscriptions(planId)
        console.log('Found subscriptions:', subscriptions)
        
        if (subscriptions.length === 0) {
          toast('No subscriptions found for this plan', {
            icon: 'ℹ️',
            duration: 3000,
          })
          return
        }
      } catch (subError: any) {
        console.error('Error getting subscriptions:', subError)
        if (subError.message.includes('could not decode result data') || subError.code === 'BAD_DATA') {
          toast('Plan not found on smart contract. It may need to be created on-chain first.', {
            icon: '⚠️',
            duration: 5000,
          })
        } else {
          toast(`Error fetching subscriptions: ${subError.message}`, {
            icon: '❌',
            duration: 5000,
          })
        }
        return
      }
      
      let processedCount = 0
      let errorCount = 0
      
      for (const subscription of subscriptions) {
        if (subscription.isActive) {
          try {
            // Check if payment is due (current time >= nextPaymentDue)
            const currentTime = Math.floor(Date.now() / 1000)
            if (currentTime >= Number(subscription.nextPaymentDue)) {
              await billingPlanService.processPayment(planId, subscription.subscriber)
              processedCount++
              toast.success(`Payment processed for ${subscription.subscriber.slice(0, 6)}...`)
            }
          } catch (error) {
            console.error(`Failed to process payment for ${subscription.subscriber}:`, error)
            errorCount++
          }
        }
      }
      
      if (processedCount > 0) {
        toast.success(`Successfully processed ${processedCount} payment(s)!`)
      } else if (errorCount > 0) {
        toast.error(`Failed to process ${errorCount} payment(s). Check subscriber balances and allowances.`)
      } else {
        toast.success('No payments due at this time.')
      }
      
    } catch (error) {
      console.error('Error processing payments:', error)
      toast.error('Failed to process payments')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAutomaticPayments = async (planId: string) => {
    if (!provider) {
      toast.error('Please connect your wallet to enable automatic payments.')
      return
    }

    // Check if user has access to automatic payments
    if (!canAccessAutomaticPayments()) {
      toast.error('Automatic payments are only available for Pro and Enterprise users. Please upgrade your plan.')
      return
    }

    const isCurrentlyEnabled = automaticPaymentsEnabled.has(planId)
    
    try {
      if (isCurrentlyEnabled) {
        // Disable automatic payments
        automaticPaymentService.stopAutomaticPayments(planId)
        setAutomaticPaymentsEnabled(prev => {
          const newSet = new Set(prev)
          newSet.delete(planId)
          return newSet
        })
        toast.success('Automatic payments disabled for this plan')
      } else {
        // Enable automatic payments
        const success = await automaticPaymentService.startAutomaticPayments(
          planId,
          userTier,
          provider as BrowserProvider, // Type assertion since we know provider is BrowserProvider
          (_, subscriber, success) => {
            if (success) {
              toast.success(`Automatic payment processed for ${subscriber.slice(0, 6)}...`, {
                duration: 4000,
              })
            } else {
              toast.error(`Automatic payment failed for ${subscriber.slice(0, 6)}...`, {
                duration: 4000,
              })
            }
          }
        )
        
        if (success) {
          setAutomaticPaymentsEnabled(prev => new Set(prev).add(planId))
          toast.success('Automatic payments enabled for this plan! Real-time event monitoring active.')
        } else {
          toast.error('Failed to enable automatic payments')
        }
      }
    } catch (error) {
      console.error('Error toggling automatic payments:', error)
      toast.error('Failed to toggle automatic payments')
    }
  }

  const canAccessAutomaticPayments = () => {
    return userTier === 'pro' || userTier === 'enterprise'
  }

  const handleCopyLink = (planId: string) => {
    console.log('Copying link for planId:', planId) // Debug log
    const subscriptionLink = `${window.location.origin}/subscribe/${planId}`
    console.log('Generated subscription link:', subscriptionLink) // Debug log
    navigator.clipboard.writeText(subscriptionLink)
    toast.success('Subscription link copied to clipboard!')
  }

  const filteredPlans = (plans || []).filter(plan =>
    plan?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan?.recipient_wallet?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatInterval = (interval: string) => {
    return interval.charAt(0).toUpperCase() + interval.slice(1)
  }

  const formatAddress = (address: string | undefined) => {
    if (!address) return 'Unknown address'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown date'
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return 'Invalid date'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Show warning if not connected */}
      {!isConnected && (
        <Card className="mb-4 border-red-500 border">
          <CardContent className="flex flex-col items-center justify-center py-4">
            <p className="text-red-600 font-semibold text-center">
              Please connect your wallet to manage billing plans.
            </p>
          </CardContent>
        </Card>
      )}
      {/* Show warning if provider is missing */}
      {isConnected && !provider && (
        <Card className="mb-4 border-red-500 border">
          <CardContent className="flex flex-col items-center justify-center py-4">
            <p className="text-red-600 font-semibold text-center">
              Your connected wallet does not support on-chain transactions.<br />
              Please make sure you're using the Coinbase Wallet extension.
            </p>
          </CardContent>
        </Card>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Billing Plans</h2>
          <p className="text-muted-foreground">
            Create and manage your subscription billing plans
          </p>
          {canAccessAutomaticPayments() && (
            <p className="text-sm text-green-600 mt-1">
              ✨ Automatic payments available with your {userTier} plan
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            {(plans || []).length} / {getPlanLimits() === Infinity ? '∞' : getPlanLimits()} plans
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            disabled={!provider || (plans || []).length >= getPlanLimits() || loading}
            title={!provider ? 'Connect an on-chain wallet to create plans' : undefined}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Search plans..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Plans Grid */}
      {loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-muted-foreground">Loading billing plans...</p>
          </CardContent>
        </Card>
      ) : filteredPlans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No billing plans yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Create your first billing plan to start accepting recurring payments
            </p>
            <Button onClick={() => setIsModalOpen(true)} disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
          {filteredPlans.map((plan) => {
            console.log('Rendering plan:', plan) // Debug log
            return (
            <Card key={plan.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loading}
                      onClick={() => handleProcessPayments(plan.plan_id)}
                      title="Process due payments for this plan"
                    >
                      <PlayCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loading}
                      onClick={() => {
                        setEditingPlan(plan)
                        setIsModalOpen(true)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loading}
                      onClick={() => handleDeletePlan(plan.plan_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Created {new Date(plan.created_at).toLocaleDateString()
                }</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Plan Details */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="font-semibold">${plan.amount} USDC</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>{formatInterval(plan.interval)}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span className="text-sm">Created: {formatDate(plan.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Wallet className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-mono">
                      {formatAddress(plan.recipient_wallet)}
                    </span>
                  </div>
                </div>

                {/* Subscription Link and Payment Management */}
                <div className="pt-4 border-t space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Subscription Link:</p>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-muted rounded p-2 text-sm font-mono truncate">
                        {plan.plan_id ? `${window.location.origin}/subscribe/${plan.plan_id}` : 'Loading...'}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!plan.plan_id}
                        onClick={() => handleCopyLink(plan.plan_id)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!plan.plan_id}
                        onClick={() => plan.plan_id && window.open(`${window.location.origin}/subscribe/${plan.plan_id}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Payment Management:</p>
                    <div className="space-y-2">
                      {/* Manual Payment Processing */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!provider || loading}
                        onClick={() => handleProcessPayments(plan.plan_id)}
                        className="w-full"
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Process Due Payments
                      </Button>
                      
                      {/* Automatic Payment Toggle (Pro/Enterprise only) */}
                      {canAccessAutomaticPayments() ? (
                        <Button
                          variant={automaticPaymentsEnabled.has(plan.plan_id) ? "default" : "outline"}
                          size="sm"
                          disabled={!provider || loading}
                          onClick={() => handleToggleAutomaticPayments(plan.plan_id)}
                          className="w-full"
                        >
                          {automaticPaymentsEnabled.has(plan.plan_id) ? (
                            <>
                              <ZapOff className="w-4 h-4 mr-2" />
                              Disable Auto Payments
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Enable Auto Payments
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="flex items-center justify-center p-2 bg-muted rounded text-sm text-muted-foreground">
                          <Crown className="w-4 h-4 mr-2" />
                          <span>Auto payments: Pro/Enterprise only</span>
                        </div>
                      )}
                      
                      {/* Status indicator for automatic payments */}
                      {automaticPaymentsEnabled.has(plan.plan_id) && (
                        <div className="flex items-center justify-center p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                          <Zap className="w-4 h-4 mr-2" />
                          <span>Automatic payments active</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}

      {/* Plan Creation Modal */}
      <BillingPlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={editingPlan ? handleEditPlan : handleCreatePlan}
        editingPlan={editingPlan}
        currentWallet={address || ''}
      />
    </motion.div>
  )
}
