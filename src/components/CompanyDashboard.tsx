import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  TrendingUp, 
  Activity, 
  DollarSign, 
  Building2,
  CreditCard,
  BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BillingPlans } from './BillingPlans'
import { useWallet } from '@/hooks/useWallet'

export const CompanyDashboard: React.FC = () => {
  const { address } = useWallet()
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'team' | 'analytics'>('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Real stats state (replace mock data)
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalRevenue: 0,
    totalSubscriptions: 0
  })

  // Activity state - COMMENTED OUT FOR NOW
  // const [recentActivity, setRecentActivity] = useState<any[]>([])

  // API URL
  // Use the deployed backend API for now since Vite doesn't handle api/ folder in dev
  const API_URL = import.meta.env.VITE_API_URL || 'https://autopay-vault-api.vercel.app'

  // Polling for real-time stats
  useEffect(() => {
    if (!address) {
      console.log('CompanyDashboard: No wallet address available')
      return
    }

    console.log('CompanyDashboard: Fetching data for address:', address)

    let isMounted = true
    const fetchStats = async () => {
      try {
        console.log('Fetching stats from:', `${API_URL}/api/company-dashboard-stats?creatorAddress=${address}`)
        const res = await fetch(`${API_URL}/api/company-dashboard-stats?creatorAddress=${address}`)
        if (!res.ok) {
          console.error('Stats fetch failed:', res.status, res.statusText)
          throw new Error('Failed to fetch stats')
        }
        const data = await res.json()
        console.log('Stats data received:', data)
        if (isMounted) setStats(data)

        // Fetch activity data - COMMENTED OUT FOR NOW
        // console.log('Fetching activity from:', `${API_URL}/api/company-dashboard-activity?creatorAddress=${address}`)
        // const activityRes = await fetch(`${API_URL}/api/company-dashboard-activity?creatorAddress=${address}`)
        // if (activityRes.ok) {
        //   const activityData = await activityRes.json()
        //   console.log('Activity data received:', activityData)
        //   if (isMounted) setRecentActivity(activityData.activities || [])
        // } else {
        //   console.error('Activity fetch failed:', activityRes.status, activityRes.statusText)
        // }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
        // Keep existing stats on error
      }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 15000) // Refresh every 15 seconds
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [address, API_URL])

  // Manual refresh handler
  const handleRefresh = async () => {
    if (!address) return

    setIsRefreshing(true)
    try {
      const res = await fetch(`${API_URL}/api/company-dashboard-stats?creatorAddress=${address}`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data)

      // Fetch activity data - COMMENTED OUT FOR NOW
      // const activityRes = await fetch(`${API_URL}/api/company-dashboard-activity?creatorAddress=${address}`)
      // if (activityRes.ok) {
      //   const activityData = await activityRes.json()
      //   setRecentActivity(activityData.activities || [])
      // }
    } catch (err) {
      console.error('Error refreshing dashboard stats:', err)
    } finally {
      setIsRefreshing(false)
    }
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
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Company Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your clients, team, and subscription analytics
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <Activity className="w-4 h-4 mr-2" />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'plans', label: 'Billing Plans', icon: CreditCard },
          // { key: 'clients', label: 'Clients', icon: Users },
          // { key: 'team', label: 'Team', icon: Users },
          // { key: 'analytics', label: 'Analytics', icon: TrendingUp }
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeTab === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(key as any)}
            className="flex items-center space-x-2"
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                    <p className="text-2xl font-bold">{stats.totalClients}</p>
                  </div>
                  <Users className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                    <p className="text-2xl font-bold">{stats.activeClients}</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Subscriptions</p>
                    <p className="text-2xl font-bold">{stats.totalSubscriptions}</p>
                  </div>
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AutoPay Vault Features */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center space-x-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                >
                  <DollarSign className="w-4 h-4 text-white" />
                </motion.div>
                <span>AutoPay Vault Features</span>
              </CardTitle>
              <CardDescription>Powerful tools for subscription management</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    transition: { duration: 0.2 }
                  }}
                  transition={{ delay: 0.1 }}
                  className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-green-200 dark:border-green-800 cursor-pointer hover:bg-green-50/50 dark:hover:bg-green-950/20 hover:border-green-300 dark:hover:border-green-700 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <motion.div 
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"
                    >
                      <CreditCard className="w-4 h-4 text-green-600" />
                    </motion.div>
                    <h3 className="font-semibold">Automated Payments</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Set up recurring USDC payments with smart contract automation for reliable subscription billing.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    transition: { duration: 0.2 }
                  }}
                  transition={{ delay: 0.2 }}
                  className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-50/50 dark:hover:bg-purple-950/20 hover:border-purple-300 dark:hover:border-purple-700 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <motion.div 
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                      className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center"
                    >
                      <Users className="w-4 h-4 text-purple-600" />
                    </motion.div>
                    <h3 className="font-semibold">Client Management</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Track subscriber activity, manage plans, and analyze revenue streams with comprehensive analytics.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    transition: { duration: 0.2 }
                  }}
                  transition={{ delay: 0.3 }}
                  className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-orange-200 dark:border-orange-800 cursor-pointer hover:bg-orange-50/50 dark:hover:bg-orange-950/20 hover:border-orange-300 dark:hover:border-orange-700 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <motion.div 
                      whileHover={{ 
                        rotateY: 180,
                        transition: { duration: 0.5 }
                      }}
                      className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center"
                    >
                      <BarChart3 className="w-4 h-4 text-orange-600" />
                    </motion.div>
                    <h3 className="font-semibold">Real-time Analytics</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Monitor subscription metrics, revenue trends, and client engagement with live dashboard updates.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    transition: { duration: 0.2 }
                  }}
                  transition={{ delay: 0.4 }}
                  className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <motion.div 
                      whileHover={{ 
                        scale: [1, 1.2, 1],
                        transition: { duration: 0.3 }
                      }}
                      className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center"
                    >
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </motion.div>
                    <h3 className="font-semibold">Enterprise Ready</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Built on Base blockchain with secure smart contracts and enterprise-grade reliability.
                  </p>
                </motion.div>
              </div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-dashed border-blue-300 dark:border-blue-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Getting Started</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Create your first billing plan to start accepting USDC subscriptions
                    </p>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActiveTab('plans')}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/30"
                    >
                      Create Plan
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Billing Plans Tab */}
      {activeTab === 'plans' && (
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto space-y-6">
          <BillingPlans />
        </div>
      )}

      {/* Clients Tab - Commented out for now */}
      {/*
      {activeTab === 'clients' && (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Client Management</CardTitle>
              <CardDescription>Manage your clients and their subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredClients.length === 0 ? (
                  <div className="text-center text-muted-foreground">No clients found</div>
                ) : (
                  filteredClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{client.name}</h3>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-sm font-medium">{client.subscriptions}</p>
                          <p className="text-xs text-muted-foreground">Subscriptions</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">${client.monthlyValue.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">Monthly</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                          {client.status}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      */}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>Manage your team members and their permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center text-muted-foreground">No team members found</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>Advanced analytics and reporting features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
                <p className="text-muted-foreground mb-6">
                  Detailed charts, reports, and insights will be displayed here.
                  This includes revenue trends, client growth, subscription analytics, and more.
                </p>
                <Button variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  )
}
