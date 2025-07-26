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
    // Fetch all plans for the creator (optionally filter by creator address if provided)
    const { creatorAddress } = req.query
    
    console.log('Fetching stats for creator:', creatorAddress)
    
    let plansQuery = supabase.from('billing_plans').select('id, plan_id, is_active, amount')
    if (creatorAddress) {
      plansQuery = plansQuery.eq('creator_address', creatorAddress)
    }
    const { data: plans, error: plansError } = await plansQuery
    
    if (plansError) {
      console.error('Plans query error:', plansError)
      throw new Error(`Plans query failed: ${plansError.message}`)
    }

    console.log('Found plans:', plans?.length || 0)

    // Handle case where no plans exist
    if (!plans || plans.length === 0) {
      return res.status(200).json({
        totalClients: 0,
        activeClients: 0,
        totalRevenue: 0,
        totalSubscriptions: 0
      })
    }

    // Fetch all subscriptions for these plans
    const planIds = plans.map((p: any) => p.plan_id)
    let subsQuery = supabase
      .from('plan_subscriptions')
      .select('id, is_active, plan_id, subscriber_address')
      .in('plan_id', planIds)
    const { data: subscriptions, error: subsError } = await subsQuery
    
    if (subsError) {
      console.error('Subscriptions query error:', subsError)
      throw new Error(`Subscriptions query failed: ${subsError.message}`)
    }

    console.log('Found subscriptions:', subscriptions?.length || 0)
    console.log('Found subscriptions:', subscriptions?.length || 0)

    // Create a plan lookup map for amounts
    const planLookup = plans.reduce((acc: any, plan: any) => {
      acc[plan.plan_id] = plan
      return acc
    }, {})

    // Calculate stats
    const totalClients = new Set(subscriptions?.map((s: any) => s.subscriber_address) || []).size
    const activeClients = new Set(subscriptions?.filter((s: any) => s.is_active).map((s: any) => s.subscriber_address) || []).size
    
    // Calculate total revenue based on plan amounts and active subscriptions
    const totalRevenue = (subscriptions || [])
      .filter((s: any) => s.is_active)
      .reduce((sum: number, s: any) => {
        const plan = planLookup[s.plan_id]
        return sum + (plan ? parseFloat(plan.amount) : 0)
      }, 0)
    
    const totalSubscriptions = subscriptions?.length || 0

    res.status(200).json({
      totalClients,
      activeClients,
      totalRevenue,
      totalSubscriptions
    })
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    setCorsHeaders(res, req.headers.origin as string) // Ensure CORS headers on error
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard stats' })
  }
}
