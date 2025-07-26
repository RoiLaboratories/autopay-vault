import { createClient } from '@supabase/supabase-js'
import { VercelRequest, VercelResponse } from '@vercel/node'
import { setCorsHeaders } from './cors'

// Debug environment variables
console.log('Environment check:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING'
})

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(`Missing Supabase configuration: URL=${!!supabaseUrl}, KEY=${!!supabaseKey}`)
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS first, before any other logic
  const origin = req.headers.origin as string
  setCorsHeaders(res, origin)
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { creatorAddress } = req.query
    
    console.log('Fetching clients for creator:', creatorAddress)

    if (!creatorAddress) {
      return res.status(400).json({ error: 'creatorAddress is required' })
    }

    // Get all plans for the creator
    const { data: plans, error: plansError } = await supabase
      .from('billing_plans')
      .select('id, plan_id, name, amount')
      .eq('creator_address', creatorAddress)
    
    if (plansError) {
      console.error('Error fetching plans:', plansError)
      throw plansError
    }

    console.log(`Found ${plans?.length || 0} plans for creator ${creatorAddress}`)

    if (!plans || plans.length === 0) {
      return res.status(200).json({ clients: [] })
    }

    // Get all subscriptions for these plans
    const planIds = plans.map((p: any) => p.plan_id)
    console.log('Plan IDs:', planIds)
    
    const { data: subscriptions, error: subsError } = await supabase
      .from('plan_subscriptions')
      .select('*')
      .in('plan_id', planIds)
    
    if (subsError) {
      console.error('Error fetching subscriptions:', subsError)
      throw subsError
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions`)

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ clients: [] })
    }

    // Create a plan lookup map
    const planLookup = plans.reduce((acc: Record<string, any>, plan: any) => {
      acc[plan.plan_id] = plan
      return acc
    }, {})

    // Group by subscriber_address to create client profiles
    const clientMap: Record<string, any> = {}
    
    for (const sub of subscriptions) {
      const plan = planLookup[sub.plan_id]
      if (!plan) {
        console.warn(`Plan not found for subscription: ${sub.plan_id}`)
        continue
      }

      if (!clientMap[sub.subscriber_address]) {
        clientMap[sub.subscriber_address] = {
          id: sub.subscriber_address,
          name: `Client ${sub.subscriber_address.slice(0, 6)}...${sub.subscriber_address.slice(-4)}`,
          email: `${sub.subscriber_address.slice(0, 6)}...@wallet.address`,
          status: 'inactive',
          subscriptions: 0,
          monthlyValue: 0,
          joinDate: sub.created_at,
          lastPayment: sub.last_payment_at || sub.created_at,
          subscriber_address: sub.subscriber_address
        }
      }

      const client = clientMap[sub.subscriber_address]
      
      // Count subscriptions
      client.subscriptions++
      
      // Add to monthly value if subscription is active
      if (sub.is_active) {
        client.status = 'active'
        // Convert plan amount to monthly equivalent
        if (plan.amount) {
          const monthlyAmount = parseFloat(plan.amount.toString())
          client.monthlyValue += monthlyAmount
        }
      }
      
      // Update join date to earliest subscription
      if (sub.created_at < client.joinDate) {
        client.joinDate = sub.created_at
      }
      
      // Update last payment to most recent
      if (sub.last_payment_at && sub.last_payment_at > client.lastPayment) {
        client.lastPayment = sub.last_payment_at
      }
    }

    const clients = Object.values(clientMap)
    
    console.log(`Returning ${clients.length} clients for creator ${creatorAddress}`)
    
    res.status(200).json({ clients })
  } catch (error: unknown) {
    console.error('Dashboard clients error:', error)
    setCorsHeaders(res, req.headers.origin as string)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard clients'
    res.status(500).json({ error: errorMessage })
  }
}
