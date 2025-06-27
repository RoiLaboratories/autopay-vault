import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { handleCors } from './cors'

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
  // Handle CORS
  if (handleCors(req, res)) return

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      subscription_id,
      user_address,
      status
    }: UpdateSubscriptionRequest = req.body

    // Log the request for debugging
    console.log('Update subscription request:', { subscription_id, user_address, status })

    // Validate required fields
    if (!subscription_id || !user_address || !status) {
      console.log('Missing required fields:', { subscription_id, user_address, status })
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate status value
    if (!['active', 'paused', 'cancelled'].includes(status)) {
      console.log('Invalid status value:', status)
      return res.status(400).json({ error: 'Invalid status value' })
    }

    // Update subscription status
    console.log('Attempting to update subscription in database...')
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        status
      })
      .eq('id', subscription_id)
      .eq('user_address', user_address) // Ensure user owns this subscription
      .select()

    console.log('Supabase response:', { data, error })

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.log('No data returned - subscription not found or access denied')
      return res.status(404).json({ error: 'Subscription not found or access denied' })
    }

    console.log('Subscription updated successfully:', data)

    res.status(200).json({
      message: 'Subscription updated successfully',
      subscription: data[0] // Return first item since we removed .single()
    })

  } catch (error) {
    console.error('Subscription update error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
