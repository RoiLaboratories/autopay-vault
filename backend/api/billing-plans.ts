import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'
import { setCorsHeaders } from './cors'

// Import contract ABI
const BillingPlanManagerABI = [
  // Plan management functions
  "function createPlan(string memory _planId, string memory _name, uint256 _amount, uint256 _interval, address _recipientWallet) external",
  "function updatePlan(string memory _planId, string memory _name, uint256 _amount, address _recipientWallet) external",
  "function deactivatePlan(string memory _planId) external",
  
  // Subscription functions
  "function subscribe(string memory _planId) external",
  "function processPayment(string memory _planId, address _subscriber) external",
  "function cancelSubscription(string memory _planId) external",
  
  // View functions
  "function getPlan(string memory _planId) external view returns (tuple(string planId, address creator, string name, uint256 amount, uint256 interval, address recipientWallet, bool isActive, uint256 createdAt))",
  "function getUserPlans(address _user) external view returns (string[] memory)",
  "function getPlanSubscriptions(string memory _planId) external view returns (tuple(string planId, address subscriber, uint256 nextPaymentDue, bool isActive, uint256 createdAt, uint256 lastPayment)[] memory)",
  "function hasActiveSubscription(address _user, string memory _planId) external view returns (bool)",
  "function getSubscription(address _user, string memory _planId) external view returns (tuple(string planId, address subscriber, uint256 nextPaymentDue, bool isActive, uint256 createdAt, uint256 lastPayment))",
  
  // Contract variables
  "function usdcToken() external view returns (address)",
  "function owner() external view returns (address)",
  
  // Events
  "event PlanCreated(string indexed planId, address indexed creator, string name, uint256 amount)",
  "event PlanUpdated(string indexed planId, string name, uint256 amount)",
  "event PlanDeactivated(string indexed planId)",
  "event SubscriptionCreated(string indexed planId, address indexed subscriber, uint256 nextPaymentDue)",
  "event PaymentProcessed(string indexed planId, address indexed subscriber, uint256 amount)",
  "event SubscriptionCanceled(string indexed planId, address indexed subscriber)"
]

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Contract configuration
const CONTRACT_ADDRESS = process.env.BILLING_PLAN_MANAGER_ADDRESS || ''
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org'

// Helper function to get contract instance
async function getContract() {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured')
  }
  
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  return new ethers.Contract(CONTRACT_ADDRESS, BillingPlanManagerABI, provider)
}

// Helper function to verify plan exists on-chain
async function verifyPlanOnChain(planId: string) {
  try {
    const contract = await getContract()
    const plan = await contract.getPlan(planId)
    return plan.isActive && plan.planId === planId
  } catch (error) {
    console.error('Contract verification error:', error)
    return false
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS properly
  const origin = req.headers.origin as string
  setCorsHeaders(res, origin)
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetPlans(req, res)
      case 'POST':
        return await handleCreatePlan(req, res)
      case 'PUT':
        return await handleUpdatePlan(req, res)
      case 'DELETE':
        return await handleDeletePlan(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Billing plans API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGetPlans(req: VercelRequest, res: VercelResponse) {
  const { creatorAddress, planId, public: isPublic } = req.query
  console.log('handleGetPlans query:', req.query) // Debug log

  // If planId is provided, get single plan (for subscription page)
  if (planId) {
    try {
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
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch plan' })
    }
  }

  // If public=true, get all active plans (for public browsing)
  if (isPublic === 'true') {
    try {
      const { data: plans, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Database error:', error)
        return res.status(500).json({ error: 'Failed to fetch plans' })
      }

      return res.status(200).json({ plans: plans || [] })
    } catch (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch plans' })
    }
  }

  // Otherwise, get plans for creator (for dashboard)
  if (!creatorAddress) {
    return res.status(400).json({ error: 'Creator address, plan ID, or public=true is required' })
  }

  try {
    // Get plans from database
    const { data: plans, error } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('creator_address', creatorAddress)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch plans' })
    }

    // Verify plans exist on-chain (optional verification)
    if (CONTRACT_ADDRESS && plans && plans.length > 0) {
      try {
        const contract = await getContract()
        const verifiedPlans = await Promise.all(
          plans.map(async (plan) => {
            try {
              const onChainPlan = await contract.getPlan(plan.plan_id)
              return {
                ...plan,
                onChainVerified: onChainPlan.isActive && onChainPlan.planId === plan.plan_id
              }
            } catch {
              return { ...plan, onChainVerified: false }
            }
          })
        )
        return res.status(200).json({ plans: verifiedPlans })
      } catch (error) {
        console.error('Contract verification error:', error)
        // Return plans without verification if contract fails
      }
    }

    return res.status(200).json({ plans: plans || [] })
  } catch (error) {
    console.error('Get plans error:', error)
    return res.status(500).json({ error: 'Failed to fetch plans' })
  }
}

async function handleCreatePlan(req: VercelRequest, res: VercelResponse) {
  const { planId, name, amount, interval, recipientWallet, creatorAddress, userTier, description } = req.body

  if (!planId || !name || !amount || !interval || !recipientWallet || !creatorAddress || !description) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Check plan limits
  const { data: existingPlans } = await supabase
    .from('billing_plans')
    .select('id')
    .eq('creator_address', creatorAddress)
    .eq('is_active', true)

  const planCount = existingPlans?.length || 0
  const limits = { free: 3, pro: 50, enterprise: 999999 }
  const userLimit = limits[userTier as keyof typeof limits] || 3

  if (planCount >= userLimit) {
    return res.status(400).json({ error: 'Plan limit exceeded for your tier' })
  }

  try {
    // Convert interval to seconds
    const intervalSeconds = interval === 'monthly' ? 2592000 : 31536000 // 30 days or 365 days
    const amountWei = ethers.parseUnits(amount.toString(), 6) // USDC has 6 decimals

    // Store in database first
    const { data: plan, error: dbError } = await supabase
      .from('billing_plans')
      .insert({
        plan_id: planId,
        creator_address: creatorAddress,
        name,
        amount: amount,
        interval,
        recipient_wallet: recipientWallet,
        description,
        contract_address: CONTRACT_ADDRESS,
        contract_plan_id: planId
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return res.status(500).json({ error: 'Failed to create plan in database' })
    }

    // Generate subscription link
    const subscriptionLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscribe/${planId}`

    return res.status(201).json({
      plan: {
        ...plan,
        subscriptionLink
      }
    })
  } catch (error) {
    console.error('Create plan error:', error)
    return res.status(500).json({ error: 'Failed to create plan' })
  }
}

async function handleUpdatePlan(req: VercelRequest, res: VercelResponse) {
  const { planId, name, amount, recipientWallet, creatorAddress, description } = req.body

  if (!planId || !name || !amount || !recipientWallet || !creatorAddress || !description) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Verify plan exists on-chain before updating
    if (CONTRACT_ADDRESS) {
      const isVerified = await verifyPlanOnChain(planId)
      if (!isVerified) {
        return res.status(400).json({ error: 'Plan does not exist on-chain or is inactive' })
      }
    }

    // Update in database
    const { data: plan, error } = await supabase
      .from('billing_plans')
      .update({
        name,
        amount,
        recipient_wallet: recipientWallet,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('plan_id', planId)
      .eq('creator_address', creatorAddress)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to update plan' })
    }

    return res.status(200).json({ plan })
  } catch (error) {
    console.error('Update plan error:', error)
    return res.status(500).json({ error: 'Failed to update plan' })
  }
}

async function handleDeletePlan(req: VercelRequest, res: VercelResponse) {
  const { planId, creatorAddress } = req.query

  if (!planId || !creatorAddress) {
    return res.status(400).json({ error: 'Plan ID and creator address are required' })
  }

  try {
    // Optional: Verify plan exists on-chain before deletion
    if (CONTRACT_ADDRESS) {
      const contract = await getContract()
      try {
        const onChainPlan = await contract.getPlan(planId as string)
        if (!onChainPlan.isActive) {
          console.warn(`Plan ${planId} is already inactive on-chain`)
        }
      } catch (error) {
        console.warn(`Could not verify plan ${planId} on-chain:`, error)
      }
    }

    // Deactivate in database
    const { error } = await supabase
      .from('billing_plans')
      .update({ is_active: false })
      .eq('plan_id', planId)
      .eq('creator_address', creatorAddress)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to delete plan' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Delete plan error:', error)
    return res.status(500).json({ error: 'Failed to delete plan' })
  }
}
