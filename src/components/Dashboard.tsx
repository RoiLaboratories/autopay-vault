import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Pause, 
  Play, 
  Trash2,
  ArrowUpRight,
  Calendar,
  DollarSign,
  Activity,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { type Subscription } from '@/lib/supabase'
import { useWallet } from '@/hooks/useWallet'
import { DebugPanel } from './DebugPanel'

export const Dashboard = () => {
  const { address } = useWallet()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null)

  const fetchSubscriptions = async () => {
    if (!address) return

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/get-subscriptions?user_address=${encodeURIComponent(address)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch subscriptions')
      }

      const data = await response.json()
      setSubscriptions(data.subscriptions || [])
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscriptions'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [address])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          icon: <CheckCircle2 className="w-4 h-4" />,
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          label: 'Active'
        }
      case 'paused':
        return {
          icon: <Pause className="w-4 h-4" />,
          color: 'text-amber-500',
          bg: 'bg-amber-500/10 border-amber-500/20',
          label: 'Paused'
        }
      case 'cancelled':
        return {
          icon: <XCircle className="w-4 h-4" />,
          color: 'text-red-500',
          bg: 'bg-red-500/10 border-red-500/20',
          label: 'Cancelled'
        }
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          color: 'text-gray-500',
          bg: 'bg-gray-500/10 border-gray-500/20',
          label: 'Unknown'
        }
    }
  }

  const toggleSubscription = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/update-subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_id: id,
          user_address: address,
          status: newStatus
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update subscription')
      }

      fetchSubscriptions()
      toast.success(`Subscription ${newStatus === 'active' ? 'activated' : 'paused'} successfully!`)
    } catch (err) {
      console.error('Failed to toggle subscription:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update subscription'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleDeleteClick = (id: string) => {
    setSubscriptionToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!subscriptionToDelete) return

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/update-subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_id: subscriptionToDelete,
          user_address: address,
          status: 'cancelled'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel subscription')
      }

      fetchSubscriptions()
      toast.success('Subscription cancelled successfully!')
      setDeleteDialogOpen(false)
      setSubscriptionToDelete(null)
    } catch (err) {
      console.error('Failed to delete subscription:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  // Calculate stats
  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    totalValue: subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + s.token_amount, 0),
    nextPayment: subscriptions
      .filter(s => s.status === 'active')
      .sort((a, b) => new Date(a.next_payment_date).getTime() - new Date(b.next_payment_date).getTime())[0]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-primary/40 rounded-full animate-spin animate-reverse" style={{ animationDelay: '-0.5s' }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6">
        <div className="flex items-center space-x-3">
          <XCircle className="w-5 h-5 text-destructive" />
          <p className="text-destructive font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your automated crypto subscriptions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={fetchSubscriptions}>
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Debug Panel - Remove this in production */}
      <DebugPanel />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ 
            scale: 1.05,
            y: -5,
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
          }}
          whileTap={{ scale: 0.95 }}
        >
          <Card className="glass border-0 bg-gradient-to-br from-primary/5 to-primary/10 cursor-pointer group relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.8 }}
            />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <motion.p 
                    className="text-sm font-medium text-muted-foreground"
                    whileHover={{ y: -1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    Total Subscriptions
                  </motion.p>
                  <motion.p 
                    className="text-2xl font-bold"
                    whileHover={{ scale: 1.05, y: -2 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {stats.total}
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center"
                  whileHover={{ 
                    scale: 1.1, 
                    rotate: 10,
                    backgroundColor: "rgba(59, 130, 246, 0.3)"
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <TrendingUp className="w-6 h-6 text-primary" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ 
            scale: 1.05,
            y: -5,
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
          }}
          whileTap={{ scale: 0.95 }}
        >
          <Card className="glass border-0 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 cursor-pointer group relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.8, delay: 0.1 }}
            />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <motion.p 
                    className="text-sm font-medium text-muted-foreground"
                    whileHover={{ y: -1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    Active
                  </motion.p>
                  <motion.p 
                    className="text-2xl font-bold"
                    whileHover={{ scale: 1.05, y: -2 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {stats.active}
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center"
                  whileHover={{ 
                    scale: 1.1, 
                    rotate: -10,
                    backgroundColor: "rgba(16, 185, 129, 0.3)"
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ 
            scale: 1.05,
            y: -5,
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
          }}
          whileTap={{ scale: 0.95 }}
        >
          <Card className="glass border-0 bg-gradient-to-br from-amber-500/5 to-amber-500/10 cursor-pointer group relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <motion.p 
                    className="text-sm font-medium text-muted-foreground"
                    whileHover={{ y: -1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    Monthly Volume
                  </motion.p>
                  <motion.p 
                    className="text-2xl font-bold"
                    whileHover={{ scale: 1.05, y: -2 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    ${stats.totalValue.toFixed(2)}
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center"
                  whileHover={{ 
                    scale: 1.1, 
                    rotate: 10,
                    backgroundColor: "rgba(245, 158, 11, 0.3)"
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <DollarSign className="w-6 h-6 text-amber-500" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ 
            scale: 1.05,
            y: -5,
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
          }}
          whileTap={{ scale: 0.95 }}
        >
          <Card className="glass border-0 bg-gradient-to-br from-blue-500/5 to-blue-500/10 cursor-pointer group relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <motion.p 
                    className="text-sm font-medium text-muted-foreground"
                    whileHover={{ y: -1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    Next Payment
                  </motion.p>
                  <motion.p 
                    className="text-sm font-bold"
                    whileHover={{ scale: 1.05, y: -2 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {stats.nextPayment ? formatDate(stats.nextPayment.next_payment_date) : 'None'}
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center"
                  whileHover={{ 
                    scale: 1.1, 
                    rotate: -10,
                    backgroundColor: "rgba(59, 130, 246, 0.3)"
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Calendar className="w-6 h-6 text-blue-500" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Subscriptions List */}
      {subscriptions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center py-20"
        >
          <div className="glass rounded-2xl p-12 max-w-md mx-auto">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">No subscriptions yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first automated subscription to get started with AutoPay Vault
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active Subscriptions</h2>
            <span className="text-sm text-muted-foreground">
              {subscriptions.filter(s => s.status === 'active').length} of {subscriptions.length} active
            </span>
          </div>
          
          <div className="grid gap-4">
            <AnimatePresence>
              {subscriptions.map((subscription, index) => {
                const statusConfig = getStatusConfig(subscription.status)
                
                return (
                  <motion.div
                    key={subscription.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                    whileHover={{ 
                      scale: 1.02,
                      y: -5,
                      boxShadow: "0 20px 40px rgba(0,0,0,0.15)"
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card className="glass border-0 hover:bg-accent/5 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '100%' }}
                        transition={{ duration: 1, delay: index * 0.05 }}
                      />
                      <CardContent className="p-6 relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <motion.div 
                              className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                              whileHover={{ 
                                scale: 1.1, 
                                rotate: 5,
                                backgroundColor: "rgba(59, 130, 246, 0.25)"
                              }}
                              transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            >
                              <DollarSign className="w-6 h-6 text-primary" />
                            </motion.div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <motion.h3 
                                  className="font-semibold text-lg"
                                  whileHover={{ y: -1, scale: 1.02 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                >
                                  {subscription.token_amount} {subscription.token_symbol}
                                </motion.h3>
                                <motion.div
                                  whileHover={{ scale: 1.2, rotate: 45 }}
                                  transition={{ type: "spring", stiffness: 400 }}
                                >
                                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                                </motion.div>
                              </div>
                              <motion.p 
                                className="text-sm text-muted-foreground"
                                whileHover={{ y: -1 }}
                                transition={{ type: "spring", stiffness: 300, delay: 0.05 }}
                              >
                                to {formatAddress(subscription.recipient_address)}
                              </motion.p>
                            </div>
                          </div>
                          
                          <motion.div 
                            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-2 border ${statusConfig.color} ${statusConfig.bg}`}
                            whileHover={{ scale: 1.05, y: -1 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <motion.div
                              whileHover={{ scale: 1.2, rotate: 10 }}
                              transition={{ type: "spring", stiffness: 400 }}
                            >
                              {statusConfig.icon}
                            </motion.div>
                            <span>{statusConfig.label}</span>
                          </motion.div>
                        </div>

                        <motion.div 
                          className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-border/40"
                          whileHover={{ y: -2 }}
                          transition={{ type: "spring", stiffness: 200 }}
                        >
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Frequency</p>
                            <p className="font-medium capitalize">{subscription.frequency}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Next Payment</p>
                            <p className="font-medium">{formatDate(subscription.next_payment_date)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Created</p>
                            <p className="font-medium">{formatDate(subscription.created_at)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                            <p className={`font-medium ${statusConfig.color}`}>{statusConfig.label}</p>
                          </div>
                        </motion.div>
                        
                        <motion.div 
                          className="flex items-center space-x-2 pt-4"
                          whileHover={{ y: -1 }}
                          transition={{ type: "spring", stiffness: 200 }}
                        >
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex-1"
                          >
                            <Button
                              onClick={() => toggleSubscription(subscription.id, subscription.status)}
                              variant="outline"
                              size="sm"
                              disabled={subscription.status === 'cancelled'}
                              className="w-full"
                            >
                              {subscription.status === 'active' ? (
                                <>
                                  <Pause className="w-4 h-4 mr-2" />
                                  Pause
                                </>
                              ) : subscription.status === 'paused' ? (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Resume
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Cancelled
                                </>
                              )}
                            </Button>
                          </motion.div>
                          {subscription.status !== 'cancelled' && (
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                onClick={() => handleDeleteClick(subscription.id)}
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:border-destructive/50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          )}
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this subscription? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
