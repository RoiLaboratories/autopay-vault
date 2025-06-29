import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../cors'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string
  setCorsHeaders(res, origin)
  
  if (req.method === 'OPTIONS') {
    return res.status(200).json({})
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { planId } = req.query

    console.log('Fetching plan with ID:', planId) // Debug log

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

    console.log('Supabase query result:', { plan, error }) // Debug log

    if (error || !plan) {
      console.log('Plan not found:', error) // Debug log
      return res.status(404).json({ error: 'Plan not found or inactive' })
    }

    return res.status(200).json({ plan })
  } catch (error) {
    console.error('Get plan API error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
