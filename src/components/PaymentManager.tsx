import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'react-hot-toast'
import { billingPlanService } from '@/services/BillingPlanService'
import { Clock, DollarSign, Users, AlertCircle, CheckCircle } from 'lucide-react'

interface PaymentManagerProps {
  planId: string
  planName: string
  provider: any
}

interface SubscriptionInfo {
  subscriber: string
  nextPaymentDue: bigint
  isActive: boolean
  isDue: boolean
  daysUntilDue: number
}

export const PaymentManager: React.FC<PaymentManagerProps> = ({ planId, planName, provider }) => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (provider && planId) {
      loadSubscriptions()
    }
  }, [provider, planId])

  const loadSubscriptions = async () => {
    try {
      setLoading(true)
      await billingPlanService.initialize(provider)
      
      const subs = await billingPlanService.getPlanSubscriptions(planId)
      const currentTime = Math.floor(Date.now() / 1000)
      
      const subscriptionsWithStatus = subs.map(sub => {
        const nextDue = Number(sub.nextPaymentDue)
        const isDue = currentTime >= nextDue
        const daysUntilDue = Math.ceil((nextDue - currentTime) / (24 * 60 * 60))
        
        return {
          subscriber: sub.subscriber,
          nextPaymentDue: sub.nextPaymentDue,
          isActive: sub.isActive,
          isDue,
          daysUntilDue
        }
      })
      
      setSubscriptions(subscriptionsWithStatus)
    } catch (error) {
      console.error('Error loading subscriptions:', error)
      toast.error('Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const processPayment = async (subscriberAddress: string) => {
    try {
      setProcessing(subscriberAddress)
      await billingPlanService.initialize(provider)
      
      const result = await billingPlanService.processPayment(planId, subscriberAddress)
      toast.success(`Payment processed! Tx: ${result.txHash.slice(0, 10)}...`)
      
      // Reload subscriptions to update status
      await loadSubscriptions()
    } catch (error: any) {
      console.error('Payment processing error:', error)
      if (error.message.includes('Payment not due yet')) {
        toast.error('Payment is not due yet')
      } else if (error.message.includes('Payment failed')) {
        toast.error('Payment failed - check subscriber USDC balance and allowance')
      } else {
        toast.error(error.message || 'Failed to process payment')
      }
    } finally {
      setProcessing(null)
    }
  }

  const processAllDuePayments = async () => {
    const dueSubscriptions = subscriptions.filter(sub => sub.isDue && sub.isActive)
    
    if (dueSubscriptions.length === 0) {
      toast.success('No payments are due at this time')
      return
    }

    try {
      setLoading(true)
      let processed = 0
      let failed = 0

      for (const sub of dueSubscriptions) {
        try {
          await billingPlanService.processPayment(planId, sub.subscriber)
          processed++
          toast.success(`✅ ${sub.subscriber.slice(0, 6)}...${sub.subscriber.slice(-4)}`)
        } catch (error) {
          failed++
          toast.error(`❌ ${sub.subscriber.slice(0, 6)}...${sub.subscriber.slice(-4)}`)
        }
      }

      toast.success(`Processed ${processed} payments, ${failed} failed`)
      await loadSubscriptions()
    } catch (error) {
      console.error('Batch processing error:', error)
      toast.error('Failed to process payments')
    } finally {
      setLoading(false)
    }
  }

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`
  
  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const duePayments = subscriptions.filter(sub => sub.isDue && sub.isActive)
  const upcomingPayments = subscriptions.filter(sub => !sub.isDue && sub.isActive && sub.daysUntilDue <= 7)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Payment Manager - {planName}</span>
          </CardTitle>
          <CardDescription>
            Manage recurring payments for your subscribers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-900">Due Now</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{duePayments.length}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="font-semibold text-yellow-900">Due Soon (7 days)</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{upcomingPayments.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-900">Total Active</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {subscriptions.filter(sub => sub.isActive).length}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button 
              onClick={processAllDuePayments}
              disabled={loading || duePayments.length === 0}
              variant={duePayments.length > 0 ? "default" : "outline"}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                `Process All Due (${duePayments.length})`
              )}
            </Button>
            <Button onClick={loadSubscriptions} variant="outline" disabled={loading}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Due Payments */}
      {duePayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Payments Due Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {duePayments.map((sub) => (
                <div key={sub.subscriber} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-semibold font-mono">{formatAddress(sub.subscriber)}</p>
                    <p className="text-sm text-gray-600">Due: {formatDate(sub.nextPaymentDue)}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => processPayment(sub.subscriber)}
                    disabled={processing === sub.subscriber}
                  >
                    {processing === sub.subscriber ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      'Process'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Payments */}
      {upcomingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-600">Upcoming Payments (Next 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingPayments.map((sub) => (
                <div key={sub.subscriber} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="font-semibold font-mono">{formatAddress(sub.subscriber)}</p>
                    <p className="text-sm text-gray-600">
                      Due in {sub.daysUntilDue} days: {formatDate(sub.nextPaymentDue)}
                    </p>
                  </div>
                  <span className="text-sm text-yellow-600 font-semibold">
                    {sub.daysUntilDue} days
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : subscriptions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No subscriptions found</p>
          ) : (
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <div 
                  key={sub.subscriber} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    sub.isDue ? 'bg-red-50' : sub.daysUntilDue <= 7 ? 'bg-yellow-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {sub.isDue ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : sub.daysUntilDue <= 7 ? (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <span className="font-mono font-semibold">{formatAddress(sub.subscriber)}</span>
                    </div>
                    <div>
                      <p className="text-sm">
                        Next payment: {formatDate(sub.nextPaymentDue)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {sub.isDue ? 'Payment due now!' : `Due in ${sub.daysUntilDue} days`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      sub.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {sub.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {sub.isDue && sub.isActive && (
                      <Button
                        size="sm"
                        onClick={() => processPayment(sub.subscriber)}
                        disabled={processing === sub.subscriber}
                      >
                        {processing === sub.subscriber ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          'Process'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
