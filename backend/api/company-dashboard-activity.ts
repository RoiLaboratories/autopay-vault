import { createClient } from '@supabase/supabase-js'
import { VercelRequest, VercelResponse } from '@vercel/node'
import { setCorsHeaders } from './cors'

// Debug environment variables
console.log('Environment check:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING'
})

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(`Missing Supabase configuration: URL=${!!supabaseUrl}, KEY=${!!supabaseKey}`)
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS first, before any other logic
  const origin = req.headers.origin as string
  setCorsHeaders(res, origin)
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { creatorAddress } = req.query
    
    console.log('Fetching activity for creator:', creatorAddress)

    // First, try to get activities from the activity_log table
    let activityQuery = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(10)
    if (creatorAddress && typeof creatorAddress === 'string') {
      // Filter by actor_address (who performed the action) or get activities for plans owned by this creator
      const planIds = await getPlanIdsForCreator(creatorAddress)
      if (planIds) {
        activityQuery = activityQuery.or(`actor_address.eq.${creatorAddress},plan_id.in.(${planIds})`)
      } else {
        activityQuery = activityQuery.eq('actor_address', creatorAddress)
      }
    }
    
    let { data: activityLogs, error: activityError } = await activityQuery
    if (activityError) {
      console.warn('Activity log query failed, falling back to subscription data:', activityError)
      activityLogs = []
    }

    // If we have activity logs, format them
    if (activityLogs && activityLogs.length > 0) {
      const activities = activityLogs.map((log: any) => ({
        id: log.id,
        title: formatEventTitle(log.event_type),
        description: log.description || formatEventDescription(log),
        timeAgo: getTimeAgo(new Date(log.created_at)),
        color: getEventColor(log.event_type),
        type: log.event_type
      }))
      
      console.log(`Returning ${activities.length} activities from activity_log for creator ${creatorAddress}`)
      return res.status(200).json({ activities })
    }

    // Fallback: Generate activities from subscription data if no activity logs exist
    console.log('No activity logs found, generating from subscription data')
    
    // Get all plans for the creator
    let plansQuery = supabase.from('billing_plans').select('id, plan_id, name')
    if (creatorAddress && typeof creatorAddress === 'string') {
      plansQuery = plansQuery.eq('creator_address', creatorAddress)
    }
    const { data: plans, error: plansError } = await plansQuery
    if (plansError) throw plansError

    if (!plans || plans.length === 0) {
      return res.status(200).json({ activities: [] })
    }

    // Get recent subscriptions for these plans (last 30 days)
    const planIds = plans.map((p: any) => p.plan_id)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: subscriptions, error: subsError } = await supabase
      .from('plan_subscriptions')
      .select('*')
      .in('plan_id', planIds)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (subsError) throw subsError

    // Create a plan lookup map
    const planLookup = plans.reduce((acc: Record<string, any>, plan: any) => {
      acc[plan.plan_id] = plan
      return acc
    }, {})

    // Generate activity items from subscription data
    interface Activity {
      id: string
      title: string
      description: string
      timeAgo: string
      color: string
      type: string
    }
    
    const activities: Activity[] = []
    
    for (const sub of subscriptions || []) {
      const plan = planLookup[sub.plan_id]
      if (!plan) continue

      const timeAgo = getTimeAgo(new Date(sub.created_at))
      const shortAddress = `${sub.subscriber_address.slice(0, 6)}...${sub.subscriber_address.slice(-4)}`
      
      // New subscription activity
      activities.push({
        id: `sub_${sub.id}`,
        title: 'New Subscription',
        description: `${shortAddress} subscribed to ${plan.name}`,
        timeAgo,
        color: 'bg-green-500',
        type: 'subscription'
      })

      // Payment activities (if last_payment_at exists and is different from created_at)
      if (sub.last_payment_at && sub.last_payment_at !== sub.created_at) {
        const paymentTimeAgo = getTimeAgo(new Date(sub.last_payment_at))
        activities.push({
          id: `payment_${sub.id}`,
          title: 'Payment Processed',
          description: `Payment received from ${shortAddress} for ${plan.name}`,
          timeAgo: paymentTimeAgo,
          color: 'bg-blue-500',
          type: 'payment'
        })
      }

      // Inactive subscription activities
      if (!sub.is_active) {
        activities.push({
          id: `cancel_${sub.id}`,
          title: 'Subscription Cancelled',
          description: `${shortAddress} cancelled subscription to ${plan.name}`,
          timeAgo,
          color: 'bg-red-500',
          type: 'cancellation'
        })
      }
    }

    // Limit to 10 most recent activities
    const recentActivities = activities.slice(0, 10)
    
    console.log(`Returning ${recentActivities.length} activities from subscription data for creator ${creatorAddress}`)
    
    res.status(200).json({ activities: recentActivities })
  } catch (error: unknown) {
    console.error('Dashboard activity error:', error)
    setCorsHeaders(res, req.headers.origin as string)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard activity'
    res.status(500).json({ error: errorMessage })
  }
}

// Helper function to get plan IDs for a creator
async function getPlanIdsForCreator(creatorAddress: string): Promise<string> {
  const { data: plans } = await supabase
    .from('billing_plans')
    .select('plan_id')
    .eq('creator_address', creatorAddress)
  
  return plans?.map(p => p.plan_id).join(',') || ''
}

// Helper function to format event titles
function formatEventTitle(eventType: string): string {
  switch (eventType) {
    case 'subscription_created': return 'New Subscription'
    case 'payment_success': return 'Payment Processed'
    case 'payment_failed': return 'Payment Failed'
    case 'subscription_cancelled': return 'Subscription Cancelled'
    case 'plan_created': return 'Plan Created'
    case 'plan_updated': return 'Plan Updated'
    default: return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
}

// Helper function to format event descriptions
function formatEventDescription(log: any): string {
  const targetAddress = log.target_address ? `${log.target_address.slice(0, 6)}...${log.target_address.slice(-4)}` : 'Unknown'
  
  switch (log.event_type) {
    case 'subscription_created': return `${targetAddress} subscribed to a plan`
    case 'payment_success': return `Payment received from ${targetAddress}`
    case 'payment_failed': return `Payment failed from ${targetAddress}`
    case 'subscription_cancelled': return `${targetAddress} cancelled subscription`
    case 'plan_created': return 'New billing plan created'
    case 'plan_updated': return 'Billing plan updated'
    default: return log.description || 'Activity occurred'
  }
}

// Helper function to get event colors
function getEventColor(eventType: string): string {
  switch (eventType) {
    case 'subscription_created':
    case 'payment_success':
    case 'plan_created':
      return 'bg-green-500'
    case 'payment_failed':
    case 'subscription_cancelled':
      return 'bg-red-500'
    case 'plan_updated':
      return 'bg-blue-500'
    default:
      return 'bg-gray-500'
  }
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) {
    return 'Just now'
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 30) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString()
  }
}
