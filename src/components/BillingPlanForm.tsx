import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, DollarSign, Clock, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { LimitGate } from '@/components/FeatureGate'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useWallet } from '@/hooks/useWallet'

interface BillingPlanFormProps {
  onSuccess: () => void
}

export const BillingPlanForm = ({ onSuccess }: BillingPlanFormProps) => {
  const { address } = useWallet()
  const { planLimits } = useSubscription()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPlanCount, setCurrentPlanCount] = useState(0)
  
  // Form fields for creating a billing plan
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    interval: '2592000', // 30 days in seconds (monthly)
    recipientWallet: address || '',
    creatorAddress: address || ''
  })

  // Fetch current billing plan count when component mounts
  const fetchPlanCount = async () => {
    if (!address) return

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/billing-plans?creatorAddress=${encodeURIComponent(address)}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentPlanCount(data?.plans?.length || 0)
      }
    } catch (err) {
      console.error('Failed to fetch plan count:', err)
    }
  }

  // Update recipient wallet and creator address when address changes
  useEffect(() => {
    if (address) {
      setFormData(prev => ({ ...prev, recipientWallet: address, creatorAddress: address }))
      fetchPlanCount()
    }
  }, [address])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) return

    // Validate form
    if (!formData.name.trim() || !formData.amount || !formData.recipientWallet) {
      setError('Please fill in all required fields')
      return
    }

    if (parseFloat(formData.amount) <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    setIsLoading(true)
    setError(null)

    // Always use the connected wallet address for both creatorAddress and recipientWallet unless recipientWallet is changed
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      amount: parseFloat(formData.amount),
      interval: parseInt(formData.interval),
      recipientWallet: formData.recipientWallet || address,
      creatorAddress: formData.creatorAddress || address
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/billing-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create billing plan')
      }

      await response.json()

      // Reset form
      setFormData({
        name: '',
        description: '',
        amount: '',
        interval: '2592000',
        recipientWallet: address,
        creatorAddress: address
      })

      toast.success('Billing plan created successfully!')
      // Update local count and refresh parent
      setCurrentPlanCount(prev => prev + 1)
      onSuccess()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create billing plan'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const formatInterval = (intervalSeconds: string) => {
    const days = parseInt(intervalSeconds) / (24 * 60 * 60)
    if (days === 1) return 'Daily'
    if (days === 7) return 'Weekly'
    if (days === 30) return 'Monthly'
    if (days === 365) return 'Yearly'
    return `Every ${days} days`
  }

  return (
    <LimitGate 
      limitType="plans" 
      current={currentPlanCount}
      fallback={
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Billing Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You've reached your billing plan limit of {planLimits.maxSubscriptions}.
              </p>
              <p className="text-sm text-muted-foreground">
                Upgrade to Pro to create more billing plans.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Billing Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Premium Subscription"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="Brief description of your billing plan"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USDC) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="50.00"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interval">Billing Frequency *</Label>
                  <select
                    id="interval"
                    value={formData.interval}
                    onChange={(e) => handleInputChange('interval', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    required
                  >
                    <option value="86400">Daily</option>
                    <option value="604800">Weekly</option>
                    <option value="2592000">Monthly</option>
                    <option value="31536000">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientWallet">Recipient Wallet *</Label>
                <Input
                  id="recipientWallet"
                  type="text"
                  placeholder="0x..."
                  value={formData.recipientWallet}
                  onChange={(e) => handleInputChange('recipientWallet', e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Wallet address where payments will be received
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="creatorAddress">Creator Address *</Label>
                <Input
                  id="creatorAddress"
                  type="text"
                  placeholder="0x..."
                  value={formData.creatorAddress}
                  onChange={(e) => handleInputChange('creatorAddress', e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Wallet address of the plan creator (usually your connected wallet)
                </p>
              </div>

              {/* Plan Preview */}
              {formData.name && formData.amount && (
                <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Plan Preview
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Plan Name</p>
                      <p className="font-medium">{formData.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-medium">${formData.amount} USDC</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Frequency</p>
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatInterval(formData.interval)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Recipient</p>
                      <p className="font-medium flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {formData.recipientWallet ? 
                          `${formData.recipientWallet.slice(0, 6)}...${formData.recipientWallet.slice(-4)}` : 
                          'Not set'
                        }
                      </p>
                    </div>
                  </div>
                  {formData.description && (
                    <div>
                      <p className="text-muted-foreground text-xs">Description</p>
                      <p className="text-sm">{formData.description}</p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading || !formData.name || !formData.amount || !formData.recipientWallet}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  ) : null}
                  {isLoading ? 'Creating Plan...' : 'Create Billing Plan'}
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </LimitGate>
  )
}
