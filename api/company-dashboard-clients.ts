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
    // Optionally filter by creator address
    const { creatorAddress } = req.query
    let query = supabase
      .from('plan_subscriptions')
      .select(`subscriber_address, is_active, created_at, last_payment_at, plan_id, billing_plans!inner(creator_address)`) // join with billing_plans
    if (creatorAddress) {
      query = query.eq('billing_plans.creator_address', creatorAddress)
    }
    const { data, error } = await query
    if (error) throw error

    // Group by subscriber_address
    const clientMap: Record<string, any> = {}
    for (const sub of data) {
      if (!clientMap[sub.subscriber_address]) {
        clientMap[sub.subscriber_address] = {
          subscriber_address: sub.subscriber_address,
          subscriptions: 0,
          status: sub.is_active ? 'active' : 'inactive',
          joinDate: sub.created_at,
          lastPayment: sub.last_payment_at,
        }
      }
      clientMap[sub.subscriber_address].subscriptions += 1
      // Update joinDate to earliest
      if (sub.created_at < clientMap[sub.subscriber_address].joinDate) {
        clientMap[sub.subscriber_address].joinDate = sub.created_at
      }
      // Update lastPayment to latest
      if (!clientMap[sub.subscriber_address].lastPayment || (sub.last_payment_at && sub.last_payment_at > clientMap[sub.subscriber_address].lastPayment)) {
        clientMap[sub.subscriber_address].lastPayment = sub.last_payment_at
      }
      // If any subscription is active, mark as active
      if (sub.is_active) {
        clientMap[sub.subscriber_address].status = 'active'
      }
    }
    // Convert to array
    const clients = Object.values(clientMap)
    res.status(200).json({ clients })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch clients' })
  }
}
