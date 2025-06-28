import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DollarSign, Calendar, Wallet, Check, X, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { billingPlanService } from '@/services/BillingPlanService'
import { toast } from 'react-hot-toast'

interface BillingPlan {
  id: string
  plan_id: string
  name: string
  amount: number
  interval: 'monthly' | 'yearly'
  recipient_wallet: string
  is_active: boolean
  created_at: string
}

export const SubscriptionPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const { address, provider } = useSubscription()
  const [plan, setPlan] = useState<BillingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [usdcBalance, setUsdcBalance] = useState<string>('0')
  const [isAlreadySubscribed, setIsAlreadySubscribed] = useState(false)

  useEffect(() => {
    if (planId) {
      loadPlan()
    }
  }, [planId])

  useEffect(() => {
    if (provider && address) {
      billingPlanService.initialize(provider)
      checkUsdcBalance()
      checkExistingSubscription()
    }
  }, [provider, address, plan])

  const loadPlan = async () => {
    if (!planId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/billing-plans/${planId}`)
      const data = await response.json()

      if (response.ok) {
        setPlan(data.plan)
      } else {
        toast.error('Plan not found or no longer available')
        navigate('/')
      }
    } catch (error) {
      console.error('Error loading plan:', error)
      toast.error('Failed to load plan')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const checkUsdcBalance = async () => {
    if (!address) return

    try {
      const balance = await billingPlanService.getUsdcBalance(address)
      setUsdcBalance(balance)
    } catch (error) {
      console.error('Error checking USDC balance:', error)
    }
  }

  const checkExistingSubscription = async () => {
    if (!address || !planId) return

    try {
      const hasSubscription = await billingPlanService.hasActiveSubscription(address, planId)
      setIsAlreadySubscribed(hasSubscription)
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
  }

  const handleSubscribe = async () => {
    if (!plan || !address || !planId) return

    if (parseFloat(usdcBalance) < plan.amount) {
      toast.error('Insufficient USDC balance')
      return
    }

    try {
      setSubscribing(true)

      // Subscribe on-chain
      const { txHash } = await billingPlanService.subscribe(planId)

      // Create subscription in database
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/plan-subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          subscriberAddress: address,
          transactionHash: txHash
        }),
      })

      if (response.ok) {
        toast.success('Successfully subscribed to plan!')
        setIsAlreadySubscribed(true)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to create subscription record')
      }
    } catch (error: any) {
      console.error('Subscription error:', error)
      toast.error(error.message || 'Failed to subscribe to plan')
    } finally {
      setSubscribing(false)
    }
  }

  const formatInterval = (interval: string) => {
    return interval.charAt(0).toUpperCase() + interval.slice(1)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading plan details...</p>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Plan Not Found</h2>
            <p className="text-gray-600 mb-4">
              The subscription plan you're looking for doesn't exist or is no longer available.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscribe to Plan</h1>
          <p className="text-gray-600">Join this subscription plan to get started</p>
        </div>

        {/* Plan Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span>{plan.name}</span>
              </CardTitle>
              <CardDescription>
                Recurring payment plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">${plan.amount} USDC</p>
                    <p className="text-sm text-blue-700">per {plan.interval}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">{formatInterval(plan.interval)} billing</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Recipient</span>
                  <span className="text-sm font-mono">{formatAddress(plan.recipient_wallet)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Your USDC Balance</span>
                  <span className="text-sm font-semibold">{parseFloat(usdcBalance).toFixed(2)} USDC</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          {isAlreadySubscribed ? (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <Check className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-900">Already Subscribed</h3>
                    <p className="text-sm text-green-700">You're already subscribed to this plan</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Subscription Actions */
            <Card>
              <CardContent className="pt-6">
                {!address ? (
                  <div className="text-center">
                    <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
                    <p className="text-gray-600 mb-4">
                      Please connect your wallet to subscribe to this plan
                    </p>
                    <Button onClick={() => navigate('/')} variant="outline">
                      Connect Wallet
                    </Button>
                  </div>
                ) : parseFloat(usdcBalance) < plan.amount ? (
                  <div className="text-center">
                    <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">Insufficient Balance</h3>
                    <p className="text-gray-600 mb-4">
                      You need at least ${plan.amount} USDC to subscribe to this plan.
                      Current balance: {parseFloat(usdcBalance).toFixed(2)} USDC
                    </p>
                    <Button disabled variant="outline">
                      Insufficient USDC
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-900 mb-2">Ready to Subscribe</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        By subscribing, you authorize automatic {plan.interval} payments of ${plan.amount} USDC
                      </p>
                    </div>

                    <Button
                      onClick={handleSubscribe}
                      disabled={subscribing}
                      className="w-full"
                      size="lg"
                    >
                      {subscribing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Subscribing...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Subscribe for ${plan.amount} USDC/{plan.interval}
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                      This will create an on-chain subscription and process the first payment immediately.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Back Button */}
          <div className="text-center mt-6">
            <Button onClick={() => navigate('/')} variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
