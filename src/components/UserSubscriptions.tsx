import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DollarSign, Calendar, Wallet, AlertCircle, Check, X, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'react-hot-toast'
import { ethers } from 'ethers'
import { useWallet } from '@/hooks/useWallet'
import { billingPlanService } from '@/services/BillingPlanService'

interface BillingPlan {
  id: string
  plan_id: string
  name: string
  amount: number
  interval: 'monthly' | 'yearly'
  recipient_wallet: string
  is_active: boolean
  created_at: string
  description?: string
}

interface UserSubscription {
  plan: BillingPlan
  subscription: {
    planId: string
    subscriber: string
    nextPaymentDue: bigint
    isActive: boolean
    createdAt: bigint
    lastPayment: bigint
  }
  isPaymentDue: boolean
  daysUntilDue: number
}

export const UserSubscriptions: React.FC = () => {
  const navigate = useNavigate()
  const { ethereum, address, isConnected, connectWallet } = useWallet()
  const [provider, setProvider] = useState<any>(null)
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([])
  const [loading, setLoading] = useState(false)
  const [canceling, setCanceling] = useState<string | null>(null)

  useEffect(() => {
    if (ethereum && isConnected) {
      const ethersProvider = new ethers.BrowserProvider(ethereum)
      setProvider(ethersProvider)
    } else {
      setProvider(null)
    }
  }, [ethereum, isConnected])

  useEffect(() => {
    if (provider && address) {
      loadUserSubscriptions()
    }
  }, [provider, address])

  const loadUserSubscriptions = async () => {
    if (!address || !provider) return

    try {
      setLoading(true)
      
      // Initialize billing service
      await billingPlanService.initialize(provider)
      
      // Get all public plans to check against
      const plansResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/billing-plans?public=true`)
      const plansData = await plansResponse.json()
      
      if (!plansResponse.ok || !plansData.plans) {
        throw new Error('Failed to load plans')
      }

      const userSubs: UserSubscription[] = []
      const currentTime = Math.floor(Date.now() / 1000)

      // Check each plan to see if user has an active subscription
      for (const plan of plansData.plans) {
        try {
          const hasSubscription = await billingPlanService.hasActiveSubscription(address, plan.plan_id)
          
          if (hasSubscription) {
            // Get subscription details
            const subscription = await billingPlanService.getSubscription(address, plan.plan_id)
            
            const nextDue = Number(subscription.nextPaymentDue)
            const isPaymentDue = currentTime >= nextDue
            const daysUntilDue = Math.ceil((nextDue - currentTime) / (24 * 60 * 60))
            
            userSubs.push({
              plan,
              subscription,
              isPaymentDue,
              daysUntilDue
            })
          }
        } catch (error) {
          // Subscription doesn't exist for this plan, continue
          console.log(`No subscription found for plan ${plan.plan_id}`)
        }
      }

      setSubscriptions(userSubs)
    } catch (error) {
      console.error('Error loading user subscriptions:', error)
      toast.error('Failed to load your subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async (planId: string, planName: string) => {
    if (!provider) {
      toast.error('Please connect your wallet to cancel subscription.')
      return
    }

    // Confirm cancellation
    if (!window.confirm(`Are you sure you want to cancel your subscription to "${planName}"? This action cannot be undone.`)) {
      return
    }

    try {
      setCanceling(planId)
      await billingPlanService.initialize(provider)
      
      const result = await billingPlanService.cancelSubscription(planId)
      toast.success(`Subscription canceled! Tx: ${result.txHash.slice(0, 10)}...`)
      
      // Reload subscriptions
      await loadUserSubscriptions()
    } catch (error: any) {
      console.error('Cancel subscription error:', error)
      toast.error(error.message || 'Failed to cancel subscription')
    } finally {
      setCanceling(null)
    }
  }

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatInterval = (interval: string) => {
    return interval.charAt(0).toUpperCase() + interval.slice(1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your subscriptions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Subscriptions</h1>
          <p className="text-gray-600">Manage your active billing plan subscriptions</p>
        </div>

        {/* Wallet Connection */}
        {!isConnected ? (
          <Card className="mb-6">
            <CardContent className="pt-6 text-center">
              <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
              <p className="text-gray-600 mb-4">
                Please connect your wallet to view and manage your subscriptions
              </p>
              <Button onClick={connectWallet} variant="outline">
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        ) : !provider ? (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="font-semibold text-red-900 mb-2">Wallet Not Supported</h3>
              <p className="text-red-700 mb-4">
                Your connected wallet does not support on-chain transactions.
                Please use the Coinbase Wallet extension.
              </p>
            </CardContent>
          </Card>
        ) : subscriptions.length === 0 ? (
          /* No Subscriptions */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardContent className="pt-6 text-center">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">No Active Subscriptions</h3>
                <p className="text-gray-600 mb-6">
                  You don't have any active subscriptions at the moment.
                  Browse available plans to get started.
                </p>
                <Button onClick={() => navigate('/')} variant="outline">
                  Browse Plans
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Subscriptions List */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {subscriptions.map((userSub) => (
              <Card key={userSub.plan.plan_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{userSub.plan.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      {userSub.subscription.isActive ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-semibold">
                          Inactive
                        </span>
                      )}
                      {userSub.isPaymentDue && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-semibold">
                          Payment Due
                        </span>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {userSub.plan.description || 'Recurring payment subscription'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Subscription Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold">${userSub.plan.amount} USDC</span>
                        <span className="text-sm text-gray-600">per {userSub.plan.interval}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">
                          Next payment: {formatDate(userSub.subscription.nextPaymentDue)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Wallet className="h-4 w-4 text-purple-600" />
                        <span className="text-sm">
                          Recipient: {formatAddress(userSub.plan.recipient_wallet)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-gray-600" />
                        <span className="text-sm">
                          Subscribed: {formatDate(userSub.subscription.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <DollarSign className="h-4 w-4 text-gray-600" />
                        <span className="text-sm">
                          Last payment: {formatDate(userSub.subscription.lastPayment)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        {userSub.isPaymentDue ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm text-red-600 font-semibold">
                              Payment due now!
                            </span>
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600">
                              Due in {userSub.daysUntilDue} days
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Due Warning */}
                  {userSub.isPaymentDue && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-900">Payment Overdue</span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">
                        Your payment is overdue. The plan creator may process the payment soon.
                        Make sure you have sufficient USDC balance and allowance.
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      Billing: {formatInterval(userSub.plan.interval)} • ${userSub.plan.amount} USDC
                    </div>
                    {userSub.subscription.isActive && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelSubscription(userSub.plan.plan_id, userSub.plan.name)}
                        disabled={canceling === userSub.plan.plan_id}
                      >
                        {canceling === userSub.plan.plan_id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Canceling...
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Cancel Subscription
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        {/* Back Button */}
        <div className="text-center mt-8">
          <Button onClick={() => navigate('/')} variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
