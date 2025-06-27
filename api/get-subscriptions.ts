import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user_address } = req.query

    if (!user_address || typeof user_address !== 'string') {
      return res.status(400).json({ error: 'user_address is required' })
    }

    // Get user subscriptions
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_address', user_address)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    res.status(200).json({
      subscriptions: subscriptions || []
    })

  } catch (error) {
    console.error('Get subscriptions error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
