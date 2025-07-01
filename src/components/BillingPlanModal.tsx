import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { BillingPlan } from './BillingPlans'

interface BillingPlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (planData: {
    name: string
    description: string
    amount: number
    interval: 'monthly' | 'yearly'
    recipient_wallet: string
    creator_address: string
  }) => void
  editingPlan?: BillingPlan | null
  currentWallet: string
}

export const BillingPlanModal: React.FC<BillingPlanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingPlan,
  currentWallet
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    interval: 'monthly' as 'monthly' | 'yearly',
    recipientWallet: '',
    creatorAddress: currentWallet || ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editingPlan) {
      setFormData({
        name: editingPlan.name,
        description: editingPlan.description || '',
        amount: editingPlan.amount.toString(),
        interval: editingPlan.interval,
        recipientWallet: editingPlan.recipient_wallet,
        creatorAddress: editingPlan.creator_address || currentWallet
      })
    } else {
      setFormData({
        name: '',
        description: '',
        amount: '',
        interval: 'monthly',
        recipientWallet: currentWallet,
        creatorAddress: currentWallet
      })
    }
    setErrors({})
  }, [editingPlan, currentWallet, isOpen])

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      creatorAddress: currentWallet || '',
      recipientWallet: currentWallet || '',
    }))
  }, [currentWallet])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Plan name is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0'
    }

    if (!formData.recipientWallet.trim()) {
      newErrors.recipientWallet = 'Recipient wallet address is required'
    } else if (!formData.recipientWallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      newErrors.recipientWallet = 'Please enter a valid Ethereum wallet address'
    }

    if (!formData.creatorAddress.trim()) {
      newErrors.creatorAddress = 'Creator address is required'
    } else if (!formData.creatorAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      newErrors.creatorAddress = 'Please enter a valid Ethereum wallet address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      amount: Number(formData.amount),
      interval: formData.interval,
      recipient_wallet: formData.recipientWallet.trim(),
      creator_address: formData.creatorAddress.trim()
    }
    console.log('BillingPlanModal submit payload:', payload)
    onSubmit(payload)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPlan ? 'Edit Billing Plan' : 'Create New Billing Plan'}
          </DialogTitle>
          <DialogDescription>
            {editingPlan 
              ? 'Update your billing plan details below.'
              : 'Create a new billing plan to start accepting recurring payments.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-120px)] overflow-y-auto pr-2">
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Plan Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Plan Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Premium Subscription"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="Brief description of your billing plan"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USDC) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
          </div>

          {/* Billing Interval */}
          <div className="space-y-2">
            <Label htmlFor="interval">Billing Interval *</Label>
            <select
              id="interval"
              value={formData.interval}
              onChange={(e) => handleInputChange('interval', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Recipient Wallet */}
          <div className="space-y-2">
            <Label htmlFor="recipientWallet">Recipient Wallet Address *</Label>
            <Input
              id="recipientWallet"
              placeholder="0x..."
              value={formData.recipientWallet}
              onChange={(e) => handleInputChange('recipientWallet', e.target.value)}
              className={errors.recipientWallet ? 'border-red-500' : ''}
            />
            {errors.recipientWallet && <p className="text-sm text-red-500">{errors.recipientWallet}</p>}
            <p className="text-xs text-muted-foreground">
              This is where subscription payments will be sent
            </p>
          </div>

          {/* Creator Address */}
          <div className="space-y-2">
            <Label htmlFor="creatorAddress">Creator Address *</Label>
            <Input
              id="creatorAddress"
              placeholder="0x..."
              value={formData.creatorAddress}
              onChange={(e) => handleInputChange('creatorAddress', e.target.value)}
              className={errors.creatorAddress ? 'border-red-500' : ''}
            />
            {errors.creatorAddress && <p className="text-sm text-red-500">{errors.creatorAddress}</p>}
            <p className="text-xs text-muted-foreground">
              This is the wallet address of the plan creator (usually your connected wallet)
            </p>
          </div>

          {/* Preview */}
          {formData.name && formData.amount && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><strong>Plan:</strong> {formData.name}</p>
                <p><strong>Description:</strong> {formData.description}</p>
                <p><strong>Price:</strong> ${formData.amount} USDC {formData.interval}</p>
                <p><strong>Recipient:</strong> {formData.recipientWallet.slice(0, 6)}...{formData.recipientWallet.slice(-4)}</p>
                <p><strong>Creator:</strong> {formData.creatorAddress.slice(0, 6)}...{formData.creatorAddress.slice(-4)}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BillingPlanModal
