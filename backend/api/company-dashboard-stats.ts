import { createClient } from '@supabase/supabase-js'
import { VercelRequest, VercelResponse } from '@vercel/node'
import { setCorsHeaders } from './cors'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS properly
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
    let plansQuery = supabase.from('billing_plans').select('id, plan_id, is_active, amount')
    if (creatorAddress) {
      plansQuery = plansQuery.eq('creator_address', creatorAddress)
    }
    const { data: plans, error: plansError } = await plansQuery
    if (plansError) throw plansError

    // Fetch all subscriptions for these plans
    const planIds = plans.map((p: any) => p.plan_id)
    let subsQuery = supabase
      .from('plan_subscriptions')
      .select('id, is_active, plan_id, subscriber_address')
      .in('plan_id', planIds)
    const { data: subscriptions, error: subsError } = await subsQuery
    if (subsError) throw subsError

    // Create a plan lookup map for amounts
    const planLookup = plans.reduce((acc: any, plan: any) => {
      acc[plan.plan_id] = plan
      return acc
    }, {})

    // Calculate stats
    const totalClients = new Set(subscriptions.map((s: any) => s.subscriber_address)).size
    const activeClients = new Set(subscriptions.filter((s: any) => s.is_active).map((s: any) => s.subscriber_address)).size
    
    // Calculate total revenue based on plan amounts and active subscriptions
    const totalRevenue = subscriptions
      .filter((s: any) => s.is_active)
      .reduce((sum: number, s: any) => {
        const plan = planLookup[s.plan_id]
        return sum + (plan ? parseFloat(plan.amount) : 0)
      }, 0)
    
    const totalSubscriptions = subscriptions.length

    res.status(200).json({
      totalClients,
      activeClients,
      totalRevenue,
      totalSubscriptions
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard stats' })
  }
}
