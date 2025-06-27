import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface CreateSubscriptionRequest {
  user_address: string
  recipient_address: string
  token_amount: number
  token_symbol: string
  frequency: 'daily' | 'weekly' | 'monthly'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      user_address,
      recipient_address,
      token_amount,
      token_symbol,
      frequency
    }: CreateSubscriptionRequest = req.body

    // Validate required fields
    if (!user_address || !recipient_address || !token_amount || !token_symbol || !frequency) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Calculate next payment date
    const now = new Date()
    const nextPaymentDate = new Date(now)
    
    switch (frequency) {
      case 'daily':
        nextPaymentDate.setDate(now.getDate() + 1)
        break
      case 'weekly':
        nextPaymentDate.setDate(now.getDate() + 7)
        break
      case 'monthly':
        nextPaymentDate.setMonth(now.getMonth() + 1)
        break
    }

    // Create subscription in database
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_address,
        recipient_address,
        token_amount,
        token_symbol,
        frequency,
        next_payment_date: nextPaymentDate.toISOString(),
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription: data
    })

  } catch (error) {
    console.error('Subscription creation error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
