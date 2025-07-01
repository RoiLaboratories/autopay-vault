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
    // Optionally filter by creator address (plan owner)
    const { creatorAddress } = req.query
    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    if (creatorAddress) {
      // Only show activity for plans owned by this creator
      // Need to join with billing_plans to filter by creator_address
      // Supabase JS does not support join, so fetch plan_ids for this creator first
      const { data: plans, error: plansError } = await supabase
        .from('billing_plans')
        .select('plan_id')
        .eq('creator_address', creatorAddress)
      if (plansError) throw plansError
      const planIds = plans.map((p: any) => p.plan_id)
      if (planIds.length > 0) {
        query = query.in('plan_id', planIds)
      } else {
        // No plans, so no activity
        return res.status(200).json({ activities: [] })
      }
    }
    const { data, error } = await query
    if (error) throw error
    res.status(200).json({ activities: data })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch activity' })
  }
}
