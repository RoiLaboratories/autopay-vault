import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'
import { setCorsHeaders } from './cors'

// Contract ABI - focused on subscription and verification functions
const BillingPlanManagerABI = [
  // Subscription functions (for backend payment processing)
  "function subscribe(string memory _planId) external",
  "function processPayment(string memory _planId, address _subscriber) external",
  "function cancelSubscription(string memory _planId) external",
  
  // View functions (for verification and status checking)
  "function getPlan(string memory _planId) external view returns (tuple(string planId, address creator, string name, uint256 amount, uint256 interval, address recipientWallet, bool isActive, uint256 createdAt))",
  "function hasActiveSubscription(address _user, string memory _planId) external view returns (bool)",
  "function getSubscription(address _user, string memory _planId) external view returns (tuple(string planId, address subscriber, uint256 nextPaymentDue, bool isActive, uint256 createdAt, uint256 lastPayment))",
  
  // Events (for monitoring)
  "event SubscriptionCreated(string indexed planId, address indexed subscriber, uint256 nextPaymentDue)",
  "event PaymentProcessed(string indexed planId, address indexed subscriber, uint256 amount)",
  "event SubscriptionCanceled(string indexed planId, address indexed subscriber)"
]

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Contract configuration
const CONTRACT_ADDRESS = process.env.BILLING_PLAN_MANAGER_ADDRESS || ''
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org'

// Helper function to get contract instance
const getContract = () => {
  if (!CONTRACT_ADDRESS) {
    console.warn('BILLING_PLAN_MANAGER_ADDRESS not configured')
    return null
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    return new ethers.Contract(CONTRACT_ADDRESS, BillingPlanManagerABI, provider)
  } catch (error) {
    console.error('Failed to initialize contract:', error)
    return null
  }
}

// Verify subscription status on-chain
const verifyOnChainSubscription = async (subscriberAddress: string, planId: string) => {
  const contract = getContract()
  if (!contract) return null
  
  try {
    const hasSubscription = await contract.hasActiveSubscription(subscriberAddress, planId)
    return hasSubscription
  } catch (error) {
    console.error('Failed to verify on-chain subscription:', error)
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res)
  
  if (req.method === 'OPTIONS') {
    return res.status(200).json({})
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetSubscriptions(req, res)
      case 'POST':
        return await handleCreateSubscription(req, res)
      case 'PUT':
        return await handleProcessPayment(req, res)
      case 'DELETE':
        return await handleCancelSubscription(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Plan subscriptions API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGetSubscriptions(req: VercelRequest, res: VercelResponse) {
  const { subscriberAddress, planId, verifyOnChain } = req.query

  let query = supabase.from('plan_subscriptions').select(`
    *,
    billing_plans (
      name,
      amount,
      interval,
      creator_address,
      recipient_wallet
    )
  `)

  if (subscriberAddress) {
    query = query.eq('subscriber_address', subscriberAddress)
  }

  if (planId) {
    query = query.eq('plan_id', planId)
  }

  const { data: subscriptions, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Database error:', error)
    return res.status(500).json({ error: 'Failed to fetch subscriptions' })
  }

  // Add on-chain verification if requested
  if (verifyOnChain === 'true' && subscriptions && subscriptions.length > 0) {
    const verifiedSubscriptions = await Promise.all(
      subscriptions.map(async (sub) => {
        const onChainStatus = await verifyOnChainSubscription(sub.subscriber_address, sub.plan_id)
        return {
          ...sub,
          onChainVerified: onChainStatus,
          statusMismatch: onChainStatus !== null && onChainStatus !== sub.is_active
        }
      })
    )
    return res.status(200).json({ subscriptions: verifiedSubscriptions })
  }

  return res.status(200).json({ subscriptions: subscriptions || [] })
}

async function handleCreateSubscription(req: VercelRequest, res: VercelResponse) {
  const { planId, subscriberAddress, transactionHash } = req.body

  if (!planId || !subscriberAddress) {
    return res.status(400).json({ error: 'Plan ID and subscriber address are required' })
  }

  try {
    // Get the billing plan
    const { data: plan, error: planError } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('plan_id', planId)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      return res.status(404).json({ error: 'Plan not found or inactive' })
    }

    // Check if subscription already exists in database
    const { data: existingSubscription } = await supabase
      .from('plan_subscriptions')
      .select('id')
      .eq('plan_id', planId)
      .eq('subscriber_address', subscriberAddress)
      .eq('is_active', true)
      .single()

    if (existingSubscription) {
      return res.status(400).json({ error: 'Already subscribed to this plan' })
    }

    // Verify on-chain subscription status if contract is available
    const onChainStatus = await verifyOnChainSubscription(subscriberAddress, planId)
    if (onChainStatus === true) {
      // On-chain subscription exists but not in database - sync required
      console.log('Found on-chain subscription not in database, syncing...')
    } else if (onChainStatus === false && transactionHash) {
      // Transaction hash provided but no on-chain subscription found
      console.warn('Transaction hash provided but no on-chain subscription found')
    }

    // Calculate next payment due
    const now = new Date()
    const nextPaymentDue = new Date(now)
    if (plan.interval === 'monthly') {
      nextPaymentDue.setMonth(nextPaymentDue.getMonth() + 1)
    } else {
      nextPaymentDue.setFullYear(nextPaymentDue.getFullYear() + 1)
    }

    // Create subscription
    const { data: subscription, error: subError } = await supabase
      .from('plan_subscriptions')
      .insert({
        plan_id: planId,
        subscriber_address: subscriberAddress,
        next_payment_due: nextPaymentDue.toISOString(),
        last_payment_at: now.toISOString()
      })
      .select()
      .single()

    if (subError) {
      console.error('Database error:', subError)
      return res.status(500).json({ error: 'Failed to create subscription' })
    }

    // Log the payment
    if (transactionHash) {
      await supabase.from('payment_logs').insert({
        plan_subscription_id: subscription.id,
        transaction_hash: transactionHash,
        status: 'success',
        amount: plan.amount,
        token_symbol: 'USDC'
      })
    }

    return res.status(201).json({ 
      subscription,
      onChainVerified: onChainStatus 
    })
  } catch (error) {
    console.error('Create subscription error:', error)
    return res.status(500).json({ error: 'Failed to create subscription' })
  }
}

async function handleProcessPayment(req: VercelRequest, res: VercelResponse) {
  const { planId, subscriberAddress, transactionHash } = req.body

  if (!planId || !subscriberAddress) {
    return res.status(400).json({ error: 'Plan ID and subscriber address are required' })
  }

  try {
    // Get the subscription
    const { data: subscription, error: subError } = await supabase
      .from('plan_subscriptions')
      .select(`
        *,
        billing_plans (
          amount,
          interval
        )
      `)
      .eq('plan_id', planId)
      .eq('subscriber_address', subscriberAddress)
      .eq('is_active', true)
      .single()

    if (subError || !subscription) {
      return res.status(404).json({ error: 'Active subscription not found' })
    }

    // Check if payment is due
    const now = new Date()
    const nextPaymentDue = new Date(subscription.next_payment_due)
    
    if (now < nextPaymentDue) {
      return res.status(400).json({ error: 'Payment not due yet' })
    }

    // Calculate next payment date
    const newNextPaymentDue = new Date(now)
    if (subscription.billing_plans.interval === 'monthly') {
      newNextPaymentDue.setMonth(newNextPaymentDue.getMonth() + 1)
    } else {
      newNextPaymentDue.setFullYear(newNextPaymentDue.getFullYear() + 1)
    }

    // Update subscription
    const { error: updateError } = await supabase
      .from('plan_subscriptions')
      .update({
        next_payment_due: newNextPaymentDue.toISOString(),
        last_payment_at: now.toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) {
      console.error('Database error:', updateError)
      return res.status(500).json({ error: 'Failed to update subscription' })
    }

    // Log the payment
    if (transactionHash) {
      await supabase.from('payment_logs').insert({
        plan_subscription_id: subscription.id,
        transaction_hash: transactionHash,
        status: 'success',
        amount: subscription.billing_plans.amount,
        token_symbol: 'USDC'
      })
    }

    return res.status(200).json({ 
      success: true,
      nextPaymentDue: newNextPaymentDue.toISOString()
    })
  } catch (error) {
    console.error('Process payment error:', error)
    return res.status(500).json({ error: 'Failed to process payment' })
  }
}

async function handleCancelSubscription(req: VercelRequest, res: VercelResponse) {
  const { planId, subscriberAddress } = req.query

  if (!planId || !subscriberAddress) {
    return res.status(400).json({ error: 'Plan ID and subscriber address are required' })
  }

  try {
    // Verify on-chain subscription status before canceling
    const onChainStatus = await verifyOnChainSubscription(subscriberAddress as string, planId as string)
    
    // Deactivate subscription in database
    const { error } = await supabase
      .from('plan_subscriptions')
      .update({ is_active: false })
      .eq('plan_id', planId)
      .eq('subscriber_address', subscriberAddress)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to cancel subscription' })
    }

    return res.status(200).json({ 
      success: true,
      onChainStatus,
      note: onChainStatus === true ? 'Subscription canceled in database. On-chain subscription still active.' : 'Subscription canceled successfully.'
    })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return res.status(500).json({ error: 'Failed to cancel subscription' })
  }
}
