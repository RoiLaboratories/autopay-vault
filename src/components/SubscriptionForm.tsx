import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useWallet } from '@/hooks/useWallet'

interface SubscriptionFormData {
  recipientAddress: string
  tokenAmount: string
  tokenSymbol: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
}

interface SubscriptionFormProps {
  onSuccess: () => void
}

export const SubscriptionForm = ({ onSuccess }: SubscriptionFormProps) => {
  const { address } = useWallet()
  const [formData, setFormData] = useState<SubscriptionFormData>({
    recipientAddress: '',
    tokenAmount: '',
    tokenSymbol: 'ETH',
    frequency: 'monthly'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_address: address,
          recipient_address: formData.recipientAddress,
          token_amount: parseFloat(formData.tokenAmount),
          token_symbol: formData.tokenSymbol,
          frequency: formData.frequency
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create subscription')
      }

      // Reset form
      setFormData({
        recipientAddress: '',
        tokenAmount: '',
        tokenSymbol: 'ETH',
        frequency: 'monthly'
      })

      toast.success('Subscription created successfully!')
      onSuccess()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create subscription'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                type="text"
                placeholder="0x..."
                value={formData.recipientAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, recipientAddress: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.000001"
                    placeholder="0.1"
                    className="pl-10"
                    value={formData.tokenAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, tokenAmount: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="token">Token</Label>
                <Select
                  id="token"
                  value={formData.tokenSymbol}
                  onChange={(e) => setFormData(prev => ({ ...prev, tokenSymbol: e.target.value as string }))}
                >
                  <option value="ETH">ETH</option>
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                  <option value="DAI">DAI</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Payment Frequency</Label>
              <Select
                id="frequency"
                value={formData.frequency}
                onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly' }))}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </div>

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
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : null}
                {isLoading ? 'Creating...' : 'Create Subscription'}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
