import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface UpdateSubscriptionRequest {
  subscription_id: string
  user_address: string
  status: 'active' | 'paused' | 'cancelled'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      subscription_id,
      user_address,
      status
    }: UpdateSubscriptionRequest = req.body

    // Validate required fields
    if (!subscription_id || !user_address || !status) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Update subscription status
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription_id)
      .eq('user_address', user_address) // Ensure user owns this subscription
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      return res.status(404).json({ error: 'Subscription not found or access denied' })
    }

    res.status(200).json({
      message: 'Subscription updated successfully',
      subscription: data
    })

  } catch (error) {
    console.error('Subscription update error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
