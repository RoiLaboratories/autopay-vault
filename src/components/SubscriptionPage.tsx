import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DollarSign, Calendar, Wallet, Check, X, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'react-hot-toast'
import { ethers } from 'ethers'
import { useWallet } from '@/hooks/useWallet'

// BillingPlanManager contract ABI (minimal for subscribe, hasActiveSubscription, getPlan)
const BILLING_PLAN_MANAGER_ABI = [
  'function subscribe(string _planId) external',
  'function hasActiveSubscription(address _user, string _planId) external view returns (bool)',
  'function getPlan(string _planId) external view returns (tuple(string planId, address creator, string name, uint256 amount, uint256 interval, address recipientWallet, bool isActive, uint256 createdAt))'
]

// USDC ABI (minimal)
const USDC_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)'
]

// Set these from your .env or config - use deployed addresses as fallback
const BILLING_PLAN_MANAGER_ADDRESS = import.meta.env.VITE_BILLING_PLAN_MANAGER_ADDRESS || '0xe6619e23b406BB7267bf56576018863E8b7BF4D0'
const USDC_ADDRESS = import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// Debug contract addresses on component load
console.log('=== CONTRACT ADDRESSES ===')
console.log('BILLING_PLAN_MANAGER_ADDRESS:', BILLING_PLAN_MANAGER_ADDRESS)
console.log('USDC_ADDRESS:', USDC_ADDRESS)
console.log('Environment variables:', {
  VITE_BILLING_PLAN_MANAGER_ADDRESS: import.meta.env.VITE_BILLING_PLAN_MANAGER_ADDRESS,
  VITE_USDC_CONTRACT_ADDRESS: import.meta.env.VITE_USDC_CONTRACT_ADDRESS
})

interface BillingPlan {
  id: string
  plan_id: string
  name: string
  amount: number
  interval: 'monthly' | 'yearly'
  recipient_wallet: string
  is_active: boolean
  created_at: string
}

interface SubscriptionPageProps {}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = () => {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const { ethereum, address, isConnected, connectWallet } = useWallet()
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    if (ethereum && isConnected) {
      const ethersProvider = new ethers.BrowserProvider(ethereum);
      setProvider(ethersProvider);
    } else {
      setProvider(null);
    }
  }, [ethereum, isConnected]);

  const [plan, setPlan] = useState<BillingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [usdcBalance, setUsdcBalance] = useState<string>('0')
  const [isAlreadySubscribed, setIsAlreadySubscribed] = useState(false)
  const [allowance, setAllowance] = useState<bigint>(0n)
  const [checkingAllowance, setCheckingAllowance] = useState(false)

  useEffect(() => {
    if (planId) {
      loadPlan()
    }
  }, [planId])

  useEffect(() => {
    if (provider && address && planId) {
      checkUsdcBalance()
      checkExistingSubscription()
      checkAllowance()
    } else {
      // Reset state when wallet disconnects
      setUsdcBalance('0')
      setIsAlreadySubscribed(false)
      setAllowance(0n)
    }
  }, [provider, address, planId])

  const loadPlan = async () => {
    if (!planId) return
    try {
      setLoading(true)
      // Try to get the specific plan by ID first
      let response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/billing-plans?planId=${planId}`)
      let data = await response.json()
      if (response.ok && data.plan) {
        setPlan(data.plan)
        return
      }
      // Fallback: get all public plans and find the one we need
      response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/billing-plans?public=true`)
      data = await response.json()
      if (response.ok && data.plans) {
        const foundPlan = data.plans.find((p: BillingPlan) => p.plan_id === planId)
        if (foundPlan) {
          setPlan(foundPlan)
          return
        }
      }
      toast.error('Plan not found or no longer available')
      navigate('/')
    } catch (error) {
      console.error('Error loading plan:', error)
      toast.error('Failed to load plan')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const checkUsdcBalance = async () => {
    if (!address || !provider) return
    try {
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
      const balance = await usdc.balanceOf(address)
      setUsdcBalance(ethers.formatUnits(balance, 6))
    } catch (error) {
      console.error('Error checking USDC balance:', error)
    }
  }

  const checkExistingSubscription = async () => {
    if (!address || !planId || !provider) return
    try {
      const contract = new ethers.Contract(BILLING_PLAN_MANAGER_ADDRESS, BILLING_PLAN_MANAGER_ABI, provider)
      const result = await contract.hasActiveSubscription(address, planId)
      setIsAlreadySubscribed(result)
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
  }

  const checkAllowance = async () => {
    if (!address || !provider) return
    setCheckingAllowance(true)
    try {
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
      const allowanceVal = await usdc.allowance(address, BILLING_PLAN_MANAGER_ADDRESS)
      setAllowance(BigInt(allowanceVal.toString())) // Always store as BigInt
    } catch (error) {
      setAllowance(0n)
    } finally {
      setCheckingAllowance(false)
    }
  }

  const handleApprove = async () => {
    if (!plan || !address || !provider) return
    try {
      setSubscribing(true)
      const planAmount = ethers.parseUnits(plan.amount.toString(), 6)
      // Use a larger allowance (common pattern in DeFi) - approve for multiple payments
      const largeAllowance = ethers.parseUnits((plan.amount * 12).toString(), 6) // 12 payments worth
      
      console.log('Plan amount:', planAmount.toString())
      console.log('Approving allowance:', largeAllowance.toString())
      
      // Use BrowserProvider for EIP-1193
      const signer = await provider.getSigner()
      const usdcWithSigner = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer)
      
      // Check current allowance first
      const currentAllowance = await usdcWithSigner.allowance(address, BILLING_PLAN_MANAGER_ADDRESS)
      console.log('Current allowance before approval:', currentAllowance.toString())
      
      // Some USDC tokens require setting allowance to 0 before updating
      if (currentAllowance > 0n) {
        console.log('Clearing existing allowance...')
        const tx0 = await usdcWithSigner.approve(BILLING_PLAN_MANAGER_ADDRESS, 0)
        await tx0.wait()
        toast.success('Previous allowance cleared!')
        
        // Wait for state to update
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // Approve the larger amount
      console.log('Setting new allowance...')
      const approveTx = await usdcWithSigner.approve(BILLING_PLAN_MANAGER_ADDRESS, largeAllowance)
      toast.success('Approval transaction sent! Waiting for confirmation...')
      await approveTx.wait()
      toast.success('USDC approved!')
      
      // Wait longer for the blockchain state to update
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Verify the allowance was set correctly
      const newAllowance = await usdcWithSigner.allowance(address, BILLING_PLAN_MANAGER_ADDRESS)
      console.log('New allowance after approval:', newAllowance.toString())
      
      if (newAllowance < planAmount) {
        toast.error('Allowance was not set correctly. Please try again.')
        return
      }
      
      // Refresh allowance to confirm
      await checkAllowance()
    } catch (error: any) {
      console.error('Approval error:', error)
      toast.error(error.message || 'USDC approval failed')
    } finally {
      setSubscribing(false)
    }
  }

  const handleSubscribe = async () => {
    if (!plan || !address || !planId || !provider) return
    try {
      setSubscribing(true)
      
      // 1. Get plan amount and check balance
      const planAmount = ethers.parseUnits(plan.amount.toString(), 6)
      console.log('=== SUBSCRIPTION DEBUG INFO ===')
      console.log('Plan amount from DB:', plan.amount)
      console.log('Plan amount parsed (wei):', planAmount.toString())
      console.log('Plan amount formatted:', ethers.formatUnits(planAmount, 6), 'USDC')
      console.log('Wallet address:', address)
      console.log('Plan ID:', planId)
      
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
      const usdcBalance = await usdc.balanceOf(address)
      console.log('USDC balance (wei):', usdcBalance.toString())
      console.log('USDC balance (formatted):', ethers.formatUnits(usdcBalance, 6), 'USDC')
      
      if (usdcBalance < planAmount) {
        toast.error(`Insufficient USDC balance. You have ${ethers.formatUnits(usdcBalance, 6)} USDC but need ${ethers.formatUnits(planAmount, 6)} USDC`)
        setSubscribing(false)
        return
      }
      
      // 2. Check allowance (most critical)
      const currentAllowance = await usdc.allowance(address, BILLING_PLAN_MANAGER_ADDRESS)
      console.log('Current allowance (wei):', currentAllowance.toString())
      console.log('Current allowance (formatted):', ethers.formatUnits(currentAllowance, 6), 'USDC')
      console.log('Required amount (wei):', planAmount.toString())
      console.log('Required amount (formatted):', ethers.formatUnits(planAmount, 6), 'USDC')
      console.log('Allowance sufficient?', currentAllowance >= planAmount)
      console.log('BILLING_PLAN_MANAGER_ADDRESS:', BILLING_PLAN_MANAGER_ADDRESS)
      console.log('USDC_ADDRESS:', USDC_ADDRESS)
      
      if (currentAllowance < planAmount) {
        toast.error(`Insufficient allowance. Current: ${ethers.formatUnits(currentAllowance, 6)} USDC, Required: ${ethers.formatUnits(planAmount, 6)} USDC`)
        // Refresh our local allowance state
        await checkAllowance()
        setSubscribing(false)
        return
      }
      
      // 3. Get on-chain plan data to compare (CRITICAL DEBUG STEP)
      console.log('=== CHECKING ON-CHAIN PLAN DATA ===')
      const contractWithoutSigner = new ethers.Contract(BILLING_PLAN_MANAGER_ADDRESS, BILLING_PLAN_MANAGER_ABI, provider)
      
      try {
        const onChainPlan = await contractWithoutSigner.getPlan(planId)
        console.log('On-chain plan data:')
        console.log('- Plan ID:', onChainPlan.planId)
        console.log('- Creator:', onChainPlan.creator)
        console.log('- Name:', onChainPlan.name)
        console.log('- Amount (wei):', onChainPlan.amount.toString())
        console.log('- Amount (formatted):', ethers.formatUnits(onChainPlan.amount, 6), 'USDC')
        console.log('- Recipient:', onChainPlan.recipientWallet)
        console.log('- Is Active:', onChainPlan.isActive)
        
        // Compare DB amount vs on-chain amount
        if (planAmount.toString() !== onChainPlan.amount.toString()) {
          console.warn('⚠️  AMOUNT MISMATCH!')
          console.warn('DB amount (parsed):', planAmount.toString())
          console.warn('On-chain amount:', onChainPlan.amount.toString())
          toast.error('Plan amount mismatch between database and blockchain. Please refresh and try again.')
          setSubscribing(false)
          return
        }
        
        if (!onChainPlan.isActive) {
          toast.error('This plan is no longer active on the blockchain.')
          setSubscribing(false)
          return
        }
        
        // Re-check allowance against the on-chain amount
        const onChainPlanAmount = onChainPlan.amount
        console.log('=== FINAL ALLOWANCE CHECK WITH ON-CHAIN DATA ===')
        console.log('On-chain plan amount:', onChainPlanAmount.toString())
        console.log('Current allowance:', currentAllowance.toString())
        console.log('Allowance sufficient for on-chain amount?', currentAllowance >= onChainPlanAmount)
        
        if (currentAllowance < onChainPlanAmount) {
          toast.error(`Insufficient allowance for on-chain plan amount. Current: ${ethers.formatUnits(currentAllowance, 6)} USDC, On-chain requires: ${ethers.formatUnits(onChainPlanAmount, 6)} USDC`)
          setSubscribing(false)
          return
        }
        
      } catch (planError) {
        console.error('Could not fetch on-chain plan:', planError)
        toast.error('Plan not found on blockchain. It may have been deleted.')
        setSubscribing(false)
        return
      }
      
      // 4. Subscribe with more detailed logging
      console.log('=== STARTING SUBSCRIPTION ===')
      const signer = await provider.getSigner()
      const contractWithSigner = new ethers.Contract(BILLING_PLAN_MANAGER_ADDRESS, BILLING_PLAN_MANAGER_ABI, signer)
      
      // Try to estimate gas first to catch errors early
      try {
        const gasEstimate = await contractWithSigner.subscribe.estimateGas(planId)
        console.log('Gas estimate:', gasEstimate.toString())
      } catch (gasError: any) {
        console.error('Gas estimation failed:', gasError)
        console.error('Gas error details:', gasError.reason || gasError.message)
        toast.error(`Transaction would fail: ${gasError.reason || gasError.message}`)
        setSubscribing(false)
        return
      }
      
      toast.success('Subscription transaction sent! Waiting for confirmation...')
      const tx = await contractWithSigner.subscribe(planId)
      console.log('Transaction hash:', tx.hash)
      await tx.wait()
      
      // 5. Update backend (optional, if you want to record in DB)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/plan-subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, subscriberAddress: address, transactionHash: tx.hash })
      })
      
      if (response.ok) {
        toast.success('Successfully subscribed to plan!')
        setIsAlreadySubscribed(true)
        // Refresh allowance and balance
        await checkAllowance()
        await checkUsdcBalance()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to create subscription record')
      }
    } catch (error: any) {
      console.error('Subscribe error:', error)
      console.error('Error details:', error.reason || error.message)
      toast.error(error.reason || error.message || 'Failed to subscribe to plan')
    } finally {
      setSubscribing(false)
    }
  }

  const formatInterval = (interval: string) => {
    return interval.charAt(0).toUpperCase() + interval.slice(1)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading plan details...</p>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Plan Not Found</h2>
            <p className="text-gray-600 mb-4">
              The subscription plan you're looking for doesn't exist or is no longer available.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscribe to Plan</h1>
          <p className="text-gray-600">Join this subscription plan to get started</p>
        </div>

        {/* Plan Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span>{plan.name}</span>
              </CardTitle>
              <CardDescription>
                Recurring payment plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">${plan.amount} USDC</p>
                    <p className="text-sm text-blue-700">per {plan.interval}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">{formatInterval(plan.interval)} billing</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Recipient</span>
                  <span className="text-sm font-mono">{formatAddress(plan.recipient_wallet)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Your USDC Balance</span>
                  <span className="text-sm font-semibold">{parseFloat(usdcBalance).toFixed(2)} USDC</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          {isAlreadySubscribed ? (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Check className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-900">Already Subscribed</h3>
                      <p className="text-sm text-green-700">You're already subscribed to this plan</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/my-subscriptions')}
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-100"
                  >
                    View All Subscriptions
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Subscription Actions */
            <Card>
              <CardContent className="pt-6">
                {!address ? (
                  <div className="text-center">
                    <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
                    <p className="text-gray-600 mb-4">
                      Please connect your wallet to subscribe to this plan
                    </p>
                    <Button onClick={connectWallet} variant="outline">
                      <Wallet className="h-4 w-4 mr-2" />
                      Connect Wallet
                    </Button>
                  </div>
                ) : parseFloat(usdcBalance) < plan.amount ? (
                  <div className="text-center">
                    <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">Insufficient Balance</h3>
                    <p className="text-gray-600 mb-4">
                      You need at least ${plan.amount} USDC to subscribe to this plan.
                      Current balance: {parseFloat(usdcBalance).toFixed(2)} USDC
                    </p>
                    <Button disabled variant="outline">
                      Insufficient USDC
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-900 mb-2">Ready to Subscribe</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        By subscribing, you authorize automatic {plan.interval} payments of ${plan.amount} USDC
                      </p>
                    </div>
                    {/* DEBUG: Show allowance and required amount for troubleshooting */}
                    <div className="text-xs text-gray-500 text-center">
                      Allowance: {allowance?.toString()} | Required: {ethers.parseUnits(plan.amount.toString(), 6).toString()}
                    </div>
                    
                    {/* Manual USDC Approval Link
                    <div className="text-xs text-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 mb-2">
                        <strong>Having trouble with approval?</strong>
                      </p>
                      <p className="text-yellow-700 mb-2">
                        You can manually approve USDC on Base Explorer:
                      </p>
                      <a
                        href={`https://basescan.org/address/${USDC_ADDRESS}#writeContract`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        Open USDC Contract on BaseScan →
                      </a>
                      <p className="text-yellow-700 mt-2 text-xs">
                        Use spender: <code className="bg-white px-1 rounded">{BILLING_PLAN_MANAGER_ADDRESS}</code>
                      </p>
                    </div> */}
                    {allowance < ethers.parseUnits(plan.amount.toString(), 6) ? (
                      <Button
                        onClick={handleApprove}
                        disabled={subscribing || checkingAllowance}
                        className="w-full"
                        size="lg"
                      >
                        {subscribing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Approving...
                          </>
                        ) : (
                          <>Approve USDC</>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubscribe}
                        disabled={subscribing}
                        className="w-full"
                        size="lg"
                      >
                        {subscribing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Subscribing...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Subscribe for ${plan.amount} USDC/{plan.interval}
                          </>
                        )}
                      </Button>
                    )}
                    <p className="text-xs text-gray-500 text-center">
                      This will create an on-chain subscription and process the first payment immediately.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Back Button */}
          <div className="text-center mt-6">
            <Button onClick={() => navigate('/')} variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
