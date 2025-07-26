import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  TrendingUp, 
  Activity, 
  DollarSign, 
  Building2,
  CreditCard,
  BarChart3,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BillingPlans } from './BillingPlans'
import { useWallet } from '@/hooks/useWallet'

export const CompanyDashboard: React.FC = () => {
  const { address } = useWallet()
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'clients' | 'team' | 'analytics'>('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Real stats state (replace mock data)
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalRevenue: 0,
    totalSubscriptions: 0
  })

  // Activity state
  const [recentActivity, setRecentActivity] = useState<any[]>([])

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

        // Fetch activity data
        console.log('Fetching activity from:', `${API_URL}/api/company-dashboard-activity?creatorAddress=${address}`)
        const activityRes = await fetch(`${API_URL}/api/company-dashboard-activity?creatorAddress=${address}`)
        if (activityRes.ok) {
          const activityData = await activityRes.json()
          console.log('Activity data received:', activityData)
          if (isMounted) setRecentActivity(activityData.activities || [])
        } else {
          console.error('Activity fetch failed:', activityRes.status, activityRes.statusText)
        }
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

      // Fetch activity data
      const activityRes = await fetch(`${API_URL}/api/company-dashboard-activity?creatorAddress=${address}`)
      if (activityRes.ok) {
        const activityData = await activityRes.json()
        setRecentActivity(activityData.activities || [])
      }
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
          { key: 'clients', label: 'Clients', icon: Users },
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

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest client and subscription activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <div className="text-center text-muted-foreground">No recent activity</div>
                ) : (
                  recentActivity.map((activity, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors duration-200"
                    >
                      <div className={`w-2 h-2 rounded-full ${activity.color || 'bg-blue-500'}`}></div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">{activity.timeAgo}</span>
                    </motion.div>
                  ))
                )}
              </div>
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

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <ClientsSection />
      )}

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

// Clients Section Component
const ClientsSection: React.FC = () => {
  const { address } = useWallet()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // API URL
  const API_URL = import.meta.env.VITE_API_URL || 'https://autopay-vault-api.vercel.app'

  // Fetch clients data
  useEffect(() => {
    if (!address) {
      console.log('ClientsSection: No wallet address available')
      return
    }

    const fetchClients = async () => {
      setIsLoading(true)
      try {
        console.log('Fetching clients from:', `${API_URL}/api/company-dashboard-clients?creatorAddress=${address}`)
        const res = await fetch(`${API_URL}/api/company-dashboard-clients?creatorAddress=${address}`)
        if (!res.ok) {
          console.error('Clients fetch failed:', res.status, res.statusText)
          throw new Error('Failed to fetch clients')
        }
        const data = await res.json()
        console.log('Clients data received:', data)
        setClients(data.clients || [])
      } catch (err) {
        console.error('Error fetching clients:', err)
        setClients([]) // Set empty array on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchClients()
  }, [address, API_URL])

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.subscriber_address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
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
            {isLoading ? (
              <div className="text-center text-muted-foreground">Loading clients...</div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center text-muted-foreground">
                {clients.length === 0 ? 'No clients found' : 'No clients match your search criteria'}
              </div>
            ) : (
              filteredClients.map((client, index) => (
                <motion.div 
                  key={client.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{client.name}</h3>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined: {formatDate(client.joinDate)}
                      </p>
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
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Last Payment</p>
                      <p className="text-xs text-muted-foreground">{formatDate(client.lastPayment)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                      {client.status}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" title="View Details">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Edit Client">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Remove Client">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
