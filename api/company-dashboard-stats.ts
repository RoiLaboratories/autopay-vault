import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Fetch all plans for the creator (optionally filter by creator address if provided)
    const { creatorAddress } = req.query
    let plansQuery = supabase.from('billing_plans').select('id, is_active')
    if (creatorAddress) {
      plansQuery = plansQuery.eq('creator_address', creatorAddress)
    }
    const { data: plans, error: plansError } = await plansQuery
    if (plansError) throw plansError

    // If no plans, return zeroed stats
    if (!plans || plans.length === 0) {
      return res.status(200).json({
        totalClients: 0,
        activeClients: 0,
        totalRevenue: 0,
        totalSubscriptions: 0
      })
    }

    // Fetch all subscriptions for these plans
    const planIds = plans.map((p: any) => p.id)
    let subsQuery = supabase
      .from('plan_subscriptions')
      .select('id, is_active, plan_id, amount')
      .in('plan_id', planIds)
    const { data: subscriptions, error: subsError } = await subsQuery
    if (subsError) throw subsError

    // Calculate stats
    const totalClients = new Set(subscriptions.map((s: any) => s.subscriber_address)).size
    const activeClients = new Set(subscriptions.filter((s: any) => s.is_active).map((s: any) => s.subscriber_address)).size
    const totalRevenue = subscriptions.reduce((sum: number, s: any) => sum + (s.amount || 0), 0)
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
