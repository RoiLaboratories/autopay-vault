import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { ethers } from 'ethers'

export type PlanTier = 'free' | 'pro' | 'enterprise'

export interface PlanLimits {
  maxSubscriptions: number
  maxClients: number
  features: string[]
}

export interface SubscriptionContextType {
  currentPlan: PlanTier
  isActive: boolean
  expiryDate: Date | null
  daysRemaining: number
  planLimits: PlanLimits
  isLoading: boolean
  refreshSubscription: () => Promise<void>
  subscribe: (months: number) => Promise<void>
  canAccessFeature: (feature: string) => boolean
  hasReachedLimit: (limitType: 'subscriptions' | 'clients') => boolean
}

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxSubscriptions: 3,
    maxClients: 3,
    features: ['basic_subscriptions', 'wallet_connect']
  },
  pro: {
    maxSubscriptions: 50,
    maxClients: 50,
    features: ['basic_subscriptions', 'wallet_connect', 'analytics', 'email_notifications', 'company_dashboard']
  },
  enterprise: {
    maxSubscriptions: -1, // unlimited
    maxClients: -1, // unlimited
    features: ['basic_subscriptions', 'wallet_connect', 'analytics', 'email_notifications', 'api_access', 'priority_support', 'company_dashboard']
  }
}

// Contract addresses from environment variables
const SUBSCRIPTION_CONTRACT_ADDRESS = import.meta.env.VITE_SUBSCRIPTION_CONTRACT_ADDRESS || ''
const USDC_CONTRACT_ADDRESS = import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// Minimal ABI - replace with full ABI after contract compilation
const SUBSCRIPTION_ABI = [
  'function isActive(address user) external view returns (bool)',
  'function getExpiry(address user) external view returns (uint256)',
  'function getDaysRemaining(address user) external view returns (uint256)',
  'function subscribe(uint256 months) external',
  'function pricePerMonth() external view returns (uint256)',
  'function planLimits(uint256) external view returns (uint256, uint256, bool, bool)',
  'function getPlanLimits(uint256 planTier) external view returns (tuple(uint256 maxSubscriptions, uint256 maxClients, bool hasAnalytics, bool hasApiAccess))'
]

const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)'
]

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { address, ethereum } = useWallet()
  const [currentPlan, setCurrentPlan] = useState<PlanTier>('free')
  const [isActive, setIsActive] = useState(false)
  const [expiryDate, setExpiryDate] = useState<Date | null>(null)
  const [daysRemaining, setDaysRemaining] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const refreshSubscription = async () => {
    if (!address || !SUBSCRIPTION_CONTRACT_ADDRESS) return

    setIsLoading(true)
    try {
      const provider = new ethers.BrowserProvider(ethereum)
      const contract = new ethers.Contract(SUBSCRIPTION_CONTRACT_ADDRESS, SUBSCRIPTION_ABI, provider)

      const [active, expiry, days] = await Promise.all([
        contract.isActive(address),
        contract.getExpiry(address),
        contract.getDaysRemaining(address)
      ])

      setIsActive(active)
      setDaysRemaining(Number(days))
      
      if (Number(expiry) > 0) {
        setExpiryDate(new Date(Number(expiry) * 1000))
      }

      // Determine plan tier based on subscription status
      if (active) {
        // For now, we'll assume all paid subscriptions are Pro
        // In the future, you could have different contract methods for different tiers
        setCurrentPlan('pro')
      } else {
        setCurrentPlan('free')
      }

    } catch (error) {
      console.error('Error refreshing subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const subscribe = async (months: number) => {
    if (!address || !SUBSCRIPTION_CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected or contract not deployed')
    }

    const provider = new ethers.BrowserProvider(ethereum)
    const signer = await provider.getSigner()
    
    const subscriptionContract = new ethers.Contract(SUBSCRIPTION_CONTRACT_ADDRESS, SUBSCRIPTION_ABI, signer)
    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, signer)

    // Get price per month from contract
    const pricePerMonth = await subscriptionContract.pricePerMonth()
    const totalCost = pricePerMonth * BigInt(months)

    // Check USDC balance
    const balance = await usdcContract.balanceOf(address)
    if (balance < totalCost) {
      throw new Error('Insufficient USDC balance')
    }

    // Check and set allowance if needed
    const allowance = await usdcContract.allowance(address, SUBSCRIPTION_CONTRACT_ADDRESS)
    if (allowance < totalCost) {
      const approveTx = await usdcContract.approve(SUBSCRIPTION_CONTRACT_ADDRESS, totalCost)
      await approveTx.wait()
    }

    // Subscribe
    const subscribeTx = await subscriptionContract.subscribe(months)
    await subscribeTx.wait()

    // Refresh subscription status
    await refreshSubscription()
  }

  const canAccessFeature = (feature: string): boolean => {
    return PLAN_LIMITS[currentPlan].features.includes(feature)
  }

  const hasReachedLimit = (limitType: 'subscriptions' | 'clients'): boolean => {
    const limit = limitType === 'subscriptions' 
      ? PLAN_LIMITS[currentPlan].maxSubscriptions
      : PLAN_LIMITS[currentPlan].maxClients
    
    // -1 means unlimited
    if (limit === -1) return false
    
    // TODO: Get actual counts from your backend/state
    // For now, returning false as placeholder
    return false
  }

  const planLimits = PLAN_LIMITS[currentPlan]

  useEffect(() => {
    if (address) {
      refreshSubscription()
    }
  }, [address])

  const value: SubscriptionContextType = {
    currentPlan,
    isActive,
    expiryDate,
    daysRemaining,
    planLimits,
    isLoading,
    refreshSubscription,
    subscribe,
    canAccessFeature,
    hasReachedLimit
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}
