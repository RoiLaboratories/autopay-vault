import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { ethers } from 'ethers'

export type PlanTier = 'free' | 'pro' | 'enterprise'

export interface PlanLimits {
  maxSubscriptions: number
  maxClients: number
  features: string[]
}

export interface SubscriptionContextType {
  currentPlan: PlanTier
  userTier: PlanTier // alias for currentPlan
  address: string | null
  provider: ethers.BrowserProvider | null
  isActive: boolean
  expiryDate: Date | null
  daysRemaining: number
  planLimits: PlanLimits
  isLoading: boolean
  refreshSubscription: () => Promise<void>
  subscribe: (months: number) => Promise<void>
  canAccessFeature: (feature: string) => boolean
  hasReachedLimit: (limitType: 'subscriptions' | 'clients') => boolean
  testContractConnectivity: () => Promise<boolean>
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
    features: ['basic_subscriptions', 'wallet_connect', 'analytics', 'email_notifications', 'company_dashboard', 'automatic_payments']
  },
  enterprise: {
    maxSubscriptions: -1, // unlimited
    maxClients: -1, // unlimited
    features: ['basic_subscriptions', 'wallet_connect', 'analytics', 'email_notifications', 'api_access', 'priority_support', 'company_dashboard', 'automatic_payments']
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
  'function pricePerMonth() view returns (uint256)',
  'function planLimits(uint256) external view returns (uint256 maxSubscriptions, uint256 maxClients, bool hasAnalytics, bool hasApiAccess)',
  'function getPlanLimits(uint256 planTier) external view returns (tuple(uint256, uint256, bool, bool))'
]

const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)'
]

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export const SubscriptionProvider: React.FC<{ children: ReactNode, privyWallet?: any }> = ({ children, privyWallet }) => {
  const [currentPlan, setCurrentPlan] = useState<PlanTier>('free')
  const [isActive, setIsActive] = useState(false)
  const [expiryDate, setExpiryDate] = useState<Date | null>(null)
  const [daysRemaining, setDaysRemaining] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)

  // Removed useWallet import and all usage of address/ethereum from SubscriptionProvider
  // Use Privy hooks and wallet state instead. You may need to pass privyWallet/evmWallet from App/MainApp as a prop.
  const address = privyWallet?.address || null;
  const ethereum = privyWallet?.getEip1193Provider ? privyWallet.getEip1193Provider() : null;

  // Initialize provider when ethereum is available
  useEffect(() => {
    if (ethereum && address) {
      try {
        const browserProvider = new ethers.BrowserProvider(ethereum)
        setProvider(browserProvider)
      } catch (error) {
        console.error('Failed to initialize provider:', error)
        setProvider(null)
      }
    } else {
      setProvider(null)
    }
  }, [ethereum, address])

  const refreshSubscription = async () => {
    if (!address || !SUBSCRIPTION_CONTRACT_ADDRESS) return

    setIsLoading(true)
    console.log('SubscriptionContext: Starting subscription refresh for address:', address)
    
    try {
      // Extended list of reliable RPC providers with different timeouts
      const rpcConfigs = [
        { url: 'https://mainnet.base.org', timeout: 8000 },
        { url: 'https://1rpc.io/base', timeout: 10000 },
        { url: 'https://base.gateway.tenderly.co', timeout: 10000 },
        { url: 'https://base-mainnet.public.blastapi.io', timeout: 12000 },
        { url: 'https://base.meowrpc.com', timeout: 15000 }
      ]
      
      let provider = null
      let successfulRpc = ''
      
      // Try each RPC provider with proper timeout and connection testing
      for (const config of rpcConfigs) {
        try {
          console.log('Attempting to connect to:', config.url)
          
          const testProvider = new ethers.JsonRpcProvider(config.url, {
            chainId: 8453,
            name: 'base'
          })
          
          // Test connection with timeout
          const testPromise = testProvider.getBlockNumber()
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), config.timeout)
          )
          
          const blockNumber = await Promise.race([testPromise, timeoutPromise])
          
          if (typeof blockNumber === 'number' && blockNumber > 0) {
            provider = testProvider
            successfulRpc = config.url
            console.log('Successfully connected to:', config.url, 'Block:', blockNumber)
            break
          }
        } catch (err: any) {
          console.log('Failed to connect to:', config.url, err.message)
          continue
        }
      }
      
      if (!provider) {
        console.error('All RPC providers failed')
        throw new Error('Unable to connect to Base network - please check your internet connection')
      }
      
      console.log('Using RPC provider:', successfulRpc)
      const contract = new ethers.Contract(SUBSCRIPTION_CONTRACT_ADDRESS, SUBSCRIPTION_ABI, provider)

      // Make contract calls with individual error handling and timeouts
      const callTimeout = 15000 // 15 seconds per call
      
      const makeCall = async (callName: string, callPromise: Promise<any>) => {
        try {
          console.log(`Making ${callName} call...`)
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`${callName} timeout`)), callTimeout)
          )
          const result = await Promise.race([callPromise, timeoutPromise])
          console.log(`${callName} result:`, result)
          return result
        } catch (err: any) {
          console.error(`${callName} failed:`, err.message)
          throw err
        }
      }

      // Make calls with individual fallback handling
      let active = false
      let expiry = 0
      let days = 0

      try {
        active = await makeCall('isActive', contract.isActive(address))
      } catch (err) {
        console.error('isActive call failed, defaulting to false')
        active = false
      }

      try {
        expiry = await makeCall('getExpiry', contract.getExpiry(address))
      } catch (err) {
        console.error('getExpiry call failed, defaulting to 0')
        expiry = 0
      }

      try {
        days = await makeCall('getDaysRemaining', contract.getDaysRemaining(address))
      } catch (err) {
        console.error('getDaysRemaining call failed, calculating from expiry')
        if (expiry > 0) {
          const now = Math.floor(Date.now() / 1000)
          days = Math.max(0, Math.floor((Number(expiry) - now) / 86400))
        } else {
          days = 0
        }
      }

      console.log('Final values:', { active, expiry: expiry.toString(), days: days.toString() })

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

    } catch (error: any) {
      console.error('Error refreshing subscription:', error)
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        data: error?.data,
        transaction: error?.transaction,
        stack: error?.stack
      })
      
      // Handle specific error types
      if (error?.message?.includes('Unable to connect to Base network')) {
        console.log('Network connectivity issue - keeping existing subscription state')
        // Don't change state for network errors, keep existing state
        return
      } else if (error?.code === 'CALL_EXCEPTION') {
        console.log('Contract call failed - possibly network connectivity issue')
        // Don't change state for network errors, keep existing state
        return
      } else if (error?.message?.includes('missing revert data')) {
        console.log('Contract function may not exist or network timeout')
        // Keep existing state
        return
      } else if (error?.message?.includes('timeout')) {
        console.log('Request timeout - keeping existing state')
        return
      } else {
        // For other errors, try the simple backup check first
        console.log('Unknown error - trying simple backup check')
        const backupResult = await simpleSubscriptionCheck()
        if (backupResult === false) {
          // Only reset if backup also fails
          setCurrentPlan('free')
          setIsActive(false)
          setExpiryDate(null)
          setDaysRemaining(0)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Backup function for checking subscription with minimal contract calls
  const simpleSubscriptionCheck = async () => {
    if (!address || !SUBSCRIPTION_CONTRACT_ADDRESS) return

    console.log('Running simple subscription check...')
    
    try {
      // Use only the most reliable RPC
      const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
      const contract = new ethers.Contract(SUBSCRIPTION_CONTRACT_ADDRESS, SUBSCRIPTION_ABI, provider)

      // Only check if active, which is the most important call
      const isActiveResult = await contract.isActive(address)
      console.log('Simple check - isActive:', isActiveResult)
      
      setIsActive(isActiveResult)
      setCurrentPlan(isActiveResult ? 'pro' : 'free')
      
      // If we can't get detailed info, at least we know if they have an active subscription
      if (!isActiveResult) {
        setDaysRemaining(0)
        setExpiryDate(null)
      }
      
      return isActiveResult
    } catch (error) {
      console.error('Simple subscription check failed:', error)
      return false
    }
  }

  // Function to test basic contract connectivity
  const testContractConnectivity = async () => {
    console.log('Testing contract connectivity...')
    console.log('Contract address:', SUBSCRIPTION_CONTRACT_ADDRESS)
    
    try {
      const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
      
      // Test basic network connectivity
      const blockNumber = await provider.getBlockNumber()
      console.log('Current block number:', blockNumber)
      
      // Test if contract exists
      const code = await provider.getCode(SUBSCRIPTION_CONTRACT_ADDRESS)
      console.log('Contract code length:', code?.length)
      console.log('Contract exists:', code && code !== '0x')
      
      // Test contract instantiation
      new ethers.Contract(SUBSCRIPTION_CONTRACT_ADDRESS, SUBSCRIPTION_ABI, provider)
      console.log('Contract created successfully')
      
      return true
    } catch (error) {
      console.error('Contract connectivity test failed:', error)
      return false
    }
  }

  const subscribe = async (months: number) => {
    if (!address || !SUBSCRIPTION_CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected or contract not deployed')
    }

    // First try to get a reliable connection for reading contract data
    let readProvider = null
    const rpcUrls = [
      'https://mainnet.base.org',
      'https://1rpc.io/base'
    ]
    
    for (const url of rpcUrls) {
      try {
        const testProvider = new ethers.JsonRpcProvider(url)
        await testProvider.getBlockNumber()
        readProvider = testProvider
        console.log('Using read provider:', url)
        break
      } catch (err) {
        continue
      }
    }
    
    if (!readProvider) {
      throw new Error('Unable to connect to Base network for reading contract data')
    }

    // Use wallet provider only for transactions
    if (!ethereum) {
      throw new Error('Wallet not available')
    }
    
    const writeProvider = new ethers.BrowserProvider(ethereum)
    const signer = await writeProvider.getSigner()
    
    const subscriptionContract = new ethers.Contract(SUBSCRIPTION_CONTRACT_ADDRESS, SUBSCRIPTION_ABI, signer)
    const usdcWriteContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, signer)
    const readContract = new ethers.Contract(SUBSCRIPTION_CONTRACT_ADDRESS, SUBSCRIPTION_ABI, readProvider)
    const usdcReadContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, readProvider)

    try {
      // Get price per month from contract using read provider
      console.log('Getting price per month...')
      const pricePerMonth = await readContract.pricePerMonth()
      const totalCost = pricePerMonth * BigInt(months)
      console.log('Price per month:', pricePerMonth.toString(), 'Total cost:', totalCost.toString())

      // Check USDC balance using read provider
      console.log('Checking USDC balance...')
      const balance = await usdcReadContract.balanceOf(address)
      console.log('USDC balance:', balance.toString())
      
      if (balance < totalCost) {
        throw new Error(`Insufficient USDC balance. Need ${ethers.formatUnits(totalCost, 6)} USDC, have ${ethers.formatUnits(balance, 6)} USDC`)
      }

      // Check allowance using read provider
      console.log('Checking allowance...')
      const allowance = await usdcReadContract.allowance(address, SUBSCRIPTION_CONTRACT_ADDRESS)
      console.log('Current allowance:', allowance.toString())
      
      if (allowance < totalCost) {
        console.log('Approving USDC spend...')
        console.log('Approval details:', {
          spender: SUBSCRIPTION_CONTRACT_ADDRESS,
          amount: totalCost.toString(),
          formattedAmount: ethers.formatUnits(totalCost, 6) + ' USDC'
        })
        
        // Verify we're on the correct network
        const network = await writeProvider.getNetwork()
        console.log('Current network:', network.chainId, network.name)
        
        if (network.chainId !== 8453n) {
          throw new Error(`Wrong network. Please switch to Base network (Chain ID: 8453). Currently on: ${network.chainId}`)
        }
        
        // Double-check wallet connection
        const signerAddress = await signer.getAddress()
        console.log('Signer address:', signerAddress)
        
        if (signerAddress.toLowerCase() !== address.toLowerCase()) {
          throw new Error('Wallet address mismatch. Please reconnect your wallet.')
        }
        
        console.log('Sending approval transaction...')
        try {
          const approveTx = await usdcWriteContract.approve(SUBSCRIPTION_CONTRACT_ADDRESS, totalCost)
          console.log('Approve transaction sent:', approveTx.hash)
          console.log('Waiting for confirmation...')
          
          const receipt = await approveTx.wait()
          console.log('Approve transaction confirmed in block:', receipt.blockNumber)
          
          // Verify approval was successful
          const newAllowance = await usdcReadContract.allowance(address, SUBSCRIPTION_CONTRACT_ADDRESS)
          console.log('New allowance after approval:', newAllowance.toString())
          
          if (newAllowance < totalCost) {
            throw new Error('Approval failed - allowance not updated correctly')
          }
        } catch (approvalError: any) {
          console.error('Approval transaction failed:', approvalError)
          
          if (approvalError?.code === 'ACTION_REJECTED' || approvalError?.message?.includes('rejected')) {
            throw new Error('Transaction cancelled by user')
          } else if (approvalError?.code === 'INSUFFICIENT_FUNDS') {
            throw new Error('Insufficient ETH for transaction fees')
          } else if (approvalError?.message?.includes('network')) {
            throw new Error('Network error - please check your connection and try again')
          }
          
          throw new Error(`Approval failed: ${approvalError.message}`)
        }
      } else {
        console.log('Sufficient allowance already exists:', allowance.toString())
      }

      // Subscribe
      console.log('Subscribing...')
      const subscribeTx = await subscriptionContract.subscribe(months)
      console.log('Subscribe transaction sent:', subscribeTx.hash)
      await subscribeTx.wait()
      console.log('Subscribe transaction confirmed')
      
    } catch (error: any) {
      console.error('Subscription transaction failed:', error)
      if (error?.message?.includes('insufficient funds')) {
        throw new Error('Insufficient funds for transaction fees')
      } else if (error?.message?.includes('user rejected')) {
        throw new Error('Transaction cancelled by user')
      } else if (error?.code === 'CALL_EXCEPTION') {
        throw new Error('Contract call failed - please check your network connection and try again')
      }
      throw error
    }

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
    // Re-enable automatic refresh when wallet connects
    if (address) {
      console.log('SubscriptionContext: Address changed, refreshing subscription')
      refreshSubscription()
    } else {
      // Reset to free plan when wallet disconnects
      console.log('SubscriptionContext: Wallet disconnected, resetting to free plan')
      setCurrentPlan('free')
      setIsActive(false)
      setExpiryDate(null)
      setDaysRemaining(0)
    }
  }, [address])

  const value: SubscriptionContextType = {
    currentPlan,
    userTier: currentPlan, // alias for currentPlan
    address,
    provider,
    isActive,
    expiryDate,
    daysRemaining,
    planLimits,
    isLoading,
    refreshSubscription,
    subscribe,
    canAccessFeature,
    hasReachedLimit,
    testContractConnectivity
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
