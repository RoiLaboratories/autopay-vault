import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../cors'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res)
  
  if (req.method === 'OPTIONS') {
    return res.status(200).json({})
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { planId } = req.query

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' })
    }

    // Get plan from database
    const { data: plan, error } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('plan_id', planId)
      .eq('is_active', true)
      .single()

    if (error || !plan) {
      return res.status(404).json({ error: 'Plan not found or inactive' })
    }

    return res.status(200).json({ plan })
  } catch (error) {
    console.error('Get plan API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
