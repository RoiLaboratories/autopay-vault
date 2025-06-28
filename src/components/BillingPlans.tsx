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
  CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BillingPlanModal } from './BillingPlanModal'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { toast } from 'react-hot-toast'
import { billingPlanService } from '@/services/BillingPlanService'

export interface BillingPlan {
  id: string
  planId: string
  name: string
  amount: number
  interval: 'monthly' | 'yearly'
  recipientWallet: string
  createdAt: string
  subscriptionLink?: string
  companyWallet?: string
}

export const BillingPlans: React.FC = () => {
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const { userTier, address, provider } = useSubscription()

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

  const loadPlans = async () => {
    if (!address) return

    try {
      setLoading(true)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/billing-plans?creatorAddress=${address}`)
      const data = await response.json()
      
      if (response.ok) {
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

  const handleCreatePlan = async (planData: Omit<BillingPlan, 'id' | 'planId' | 'createdAt' | 'subscriptionLink' | 'companyWallet'>) => {
    const planLimit = getPlanLimits()
    
    if ((plans || []).length >= planLimit) {
      toast.error(`Plan limit exceeded. ${userTier === 'free' ? 'Upgrade to Pro' : 'Contact support'} for more plans.`)
      return
    }

    try {
      setLoading(true)
      
      const planId = `plan_${Date.now()}`
      
      // Create plan via API
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/billing-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...planData,
          planId,
          creatorAddress: address,
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

  const handleEditPlan = async (planData: Omit<BillingPlan, 'id' | 'planId' | 'createdAt' | 'subscriptionLink' | 'companyWallet'>) => {
    if (!editingPlan) return

    try {
      setLoading(true)

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/billing-plans`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...planData,
          planId: editingPlan.planId,
          creatorAddress: address
        }),
      })

      const data = await response.json()

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

  const handleCopyLink = (planId: string) => {
    const subscriptionLink = `${window.location.origin}/subscribe/${planId}`
    navigator.clipboard.writeText(subscriptionLink)
    toast.success('Subscription link copied to clipboard!')
  }

  const filteredPlans = (plans || []).filter(plan =>
    plan?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan?.recipientWallet?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatInterval = (interval: string) => {
    return interval.charAt(0).toUpperCase() + interval.slice(1)
  }

  const formatAddress = (address: string | undefined) => {
    if (!address) return 'Unknown address'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Billing Plans</h2>
          <p className="text-muted-foreground">
            Create and manage your subscription billing plans
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            {(plans || []).length} / {getPlanLimits() === Infinity ? '∞' : getPlanLimits()} plans
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            disabled={(plans || []).length >= getPlanLimits() || loading}
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
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex items-center space-x-1">
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
                      onClick={() => handleDeletePlan(plan.planId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Created {new Date(plan.createdAt).toLocaleDateString()}
                </CardDescription>
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
                    <Wallet className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-mono">
                      {formatAddress(plan.recipientWallet)}
                    </span>
                  </div>
                </div>

                {/* Subscription Link */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Subscription Link:</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-muted rounded p-2 text-sm font-mono truncate">
                      {plan.subscriptionLink || `${window.location.origin}/subscribe/${plan.planId}`}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(plan.planId)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(plan.subscriptionLink || `${window.location.origin}/subscribe/${plan.planId}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Plan Creation Modal */}
      <BillingPlanModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingPlan(null)
        }}
        onSubmit={editingPlan ? handleEditPlan : handleCreatePlan}
        editingPlan={editingPlan}
        currentWallet={address || ''}
      />
    </motion.div>
  )
}
