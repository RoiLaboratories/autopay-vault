import { billingPlanService } from './BillingPlanService'
import type { PlanTier } from '@/contexts/SubscriptionContext'
import { ethers } from 'ethers'

// Contract ABI for events and direct calls
const BILLING_PLAN_MANAGER_ABI = [
  // Events we want to listen to
  "event SubscriptionCreated(string indexed planId, address indexed subscriber, uint256 nextPaymentDue)",
  "event PaymentProcessed(string indexed planId, address indexed subscriber, uint256 amount)",
  "event SubscriptionCanceled(string indexed planId, address indexed subscriber)",
  
  // View functions for payment tracking
  "function getPlan(string memory _planId) external view returns (tuple(string planId, address creator, string name, uint256 amount, uint256 interval, address recipientWallet, bool isActive, uint256 createdAt))",
  "function getPlanSubscriptions(string memory _planId) external view returns (tuple(string planId, address subscriber, uint256 nextPaymentDue, bool isActive, uint256 createdAt, uint256 lastPayment)[] memory)",
  "function processPayment(string memory _planId, address _subscriber) external"
]

// Contract address from environment
const BILLING_PLAN_MANAGER_ADDRESS = import.meta.env.VITE_BILLING_PLAN_MANAGER_ADDRESS || ''

export class AutomaticPaymentService {
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private contract: ethers.Contract | null = null

  /**
   * Initialize the service with contract access
   */
  async initialize(provider: ethers.BrowserProvider) {
    const signer = await provider.getSigner()
    
    this.contract = new ethers.Contract(
      BILLING_PLAN_MANAGER_ADDRESS,
      BILLING_PLAN_MANAGER_ABI,
      signer
    )
    
    console.log('AutomaticPaymentService initialized with contract access')
  }

  /**
   * Start automatic payment processing for a plan (Pro/Enterprise only)
   * Now includes both polling and event-based monitoring
   */
  async startAutomaticPayments(
    planId: string, 
    userTier: PlanTier,
    provider: ethers.BrowserProvider,
    onPaymentProcessed?: (planId: string, subscriber: string, success: boolean) => void
  ) {
    // Only allow automatic payments for Pro and Enterprise users
    if (userTier === 'free') {
      console.log('Automatic payments not available for free tier users')
      return false
    }

    // Initialize contract access if not already done
    if (!this.contract) {
      await this.initialize(provider)
    }

    // Stop any existing interval for this plan
    this.stopAutomaticPayments(planId)

    console.log(`Starting automatic payments for plan ${planId} (${userTier} tier)`)

    // 1. Set up event listeners for real-time updates
    await this.setupEventListeners(planId, onPaymentProcessed)

    // 2. Set up polling as a backup (every 10 minutes instead of 5)
    const interval = setInterval(async () => {
      try {
        await this.processAutomaticPayments(planId, onPaymentProcessed)
      } catch (error) {
        console.error(`Error in automatic payment processing for plan ${planId}:`, error)
      }
    }, 10 * 60 * 1000) // 10 minutes (longer since we have events)

    this.intervals.set(planId, interval)

    // 3. Run an initial check immediately
    setTimeout(() => {
      this.processAutomaticPayments(planId, onPaymentProcessed)
    }, 1000)

    return true
  }

  /**
   * Set up blockchain event listeners for real-time payment tracking
   */
  private async setupEventListeners(
    planId: string,
    onPaymentProcessed?: (planId: string, subscriber: string, success: boolean) => void
  ) {
    if (!this.contract) return

    try {
      // Listen for new subscriptions
      const subscriptionFilter = this.contract.filters.SubscriptionCreated(planId)
      this.contract.on(subscriptionFilter, (eventPlanId, subscriber, nextPaymentDue) => {
        console.log(`🔔 New subscription for plan ${eventPlanId}: ${subscriber}`)
        // Schedule payment check for this new subscription
        this.schedulePaymentCheck(planId, subscriber, Number(nextPaymentDue), onPaymentProcessed)
      })

      // Listen for payment processing events
      const paymentFilter = this.contract.filters.PaymentProcessed(planId)
      this.contract.on(paymentFilter, (eventPlanId, subscriber, amount) => {
        console.log(`💰 Payment processed for plan ${eventPlanId}: ${subscriber} paid ${amount}`)
        onPaymentProcessed?.(eventPlanId, subscriber, true)
      })

      // Listen for subscription cancellations
      const cancelFilter = this.contract.filters.SubscriptionCanceled(planId)
      this.contract.on(cancelFilter, (eventPlanId, subscriber) => {
        console.log(`❌ Subscription canceled for plan ${eventPlanId}: ${subscriber}`)
      })

      console.log(`✅ Event listeners set up for plan ${planId}`)
    } catch (error) {
      console.error(`Failed to set up event listeners for plan ${planId}:`, error)
    }
  }

  /**
   * Schedule a payment check for a specific time
   */
  private schedulePaymentCheck(
    planId: string,
    subscriber: string,
    nextPaymentDue: number,
    onPaymentProcessed?: (planId: string, subscriber: string, success: boolean) => void
  ) {
    const currentTime = Math.floor(Date.now() / 1000)
    const timeUntilDue = (nextPaymentDue - currentTime) * 1000 // Convert to milliseconds

    if (timeUntilDue > 0) {
      console.log(`⏰ Scheduling payment check for ${subscriber} in ${Math.round(timeUntilDue / 1000 / 60)} minutes`)
      
      setTimeout(async () => {
        try {
          console.log(`🔄 Processing scheduled payment for ${subscriber}`)
          await this.processPaymentForSubscriber(planId, subscriber)
          onPaymentProcessed?.(planId, subscriber, true)
        } catch (error) {
          console.error(`Failed to process scheduled payment for ${subscriber}:`, error)
          onPaymentProcessed?.(planId, subscriber, false)
        }
      }, timeUntilDue)
    }
  }

  /**
   * Process payment for a specific subscriber using direct contract call
   */
  private async processPaymentForSubscriber(planId: string, subscriber: string) {
    if (!this.contract) throw new Error('Contract not initialized')

    const tx = await this.contract.processPayment(planId, subscriber)
    await tx.wait()
    
    console.log(`✅ Payment processed for ${subscriber} via direct contract call`)
    return tx.hash
  }

  /**
   * Stop automatic payment processing for a plan
   */
  stopAutomaticPayments(planId: string) {
    // Stop polling interval
    const interval = this.intervals.get(planId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(planId)
      console.log(`Stopped polling for plan ${planId}`)
    }

    // Stop event listeners
    if (this.contract) {
      try {
        this.contract.removeAllListeners(this.contract.filters.SubscriptionCreated(planId))
        this.contract.removeAllListeners(this.contract.filters.PaymentProcessed(planId))
        this.contract.removeAllListeners(this.contract.filters.SubscriptionCanceled(planId))
        console.log(`Stopped event listeners for plan ${planId}`)
      } catch (error) {
        console.error(`Error stopping event listeners for plan ${planId}:`, error)
      }
    }
  }

  /**
   * Stop all automatic payment processing
   */
  stopAllAutomaticPayments() {
    // Stop all intervals
    for (const [planId, interval] of this.intervals.entries()) {
      clearInterval(interval)
      console.log(`Stopped polling for plan ${planId}`)
    }
    this.intervals.clear()

    // Stop all event listeners
    if (this.contract) {
      try {
        this.contract.removeAllListeners()
        console.log('Stopped all event listeners')
      } catch (error) {
        console.error('Error stopping all event listeners:', error)
      }
    }
  }

  /**
   * Check if automatic payments are active for a plan
   */
  isAutomaticPaymentsActive(planId: string): boolean {
    return this.intervals.has(planId)
  }

  /**
   * Get list of all plans with active automatic payments
   */
  getActivePlans(): string[] {
    return Array.from(this.intervals.keys())
  }

  /**
   * Process automatic payments for a specific plan (fallback polling method)
   */
  private async processAutomaticPayments(
    planId: string,
    onPaymentProcessed?: (planId: string, subscriber: string, success: boolean) => void
  ) {
    try {
      console.log(`🔄 Polling for due payments for plan ${planId}...`)
      
      // Use direct contract call if available, otherwise fallback to billing service
      let subscriptions: any[] = []
      
      if (this.contract) {
        try {
          subscriptions = await this.contract.getPlanSubscriptions(planId)
        } catch (error) {
          console.warn('Direct contract call failed, falling back to billing service:', error)
          subscriptions = await billingPlanService.getPlanSubscriptions(planId)
        }
      } else {
        subscriptions = await billingPlanService.getPlanSubscriptions(planId)
      }
      
      if (subscriptions.length === 0) {
        console.log(`No subscriptions found for plan ${planId}`)
        return
      }

      let processedCount = 0
      const currentTime = Math.floor(Date.now() / 1000)

      for (const subscription of subscriptions) {
        if (subscription.isActive && currentTime >= Number(subscription.nextPaymentDue)) {
          try {
            console.log(`Processing automatic payment for subscriber ${subscription.subscriber}`)
            
            // Use direct contract call if available
            if (this.contract) {
              await this.processPaymentForSubscriber(planId, subscription.subscriber)
            } else {
              await billingPlanService.processPayment(planId, subscription.subscriber)
            }
            
            processedCount++
            onPaymentProcessed?.(planId, subscription.subscriber, true)
            console.log(`✅ Automatic payment processed for ${subscription.subscriber}`)
          } catch (error) {
            console.error(`❌ Failed to process automatic payment for ${subscription.subscriber}:`, error)
            onPaymentProcessed?.(planId, subscription.subscriber, false)
          }
        }
      }

      if (processedCount > 0) {
        console.log(`Processed ${processedCount} automatic payment(s) for plan ${planId}`)
      }
    } catch (error) {
      console.error(`Error processing automatic payments for plan ${planId}:`, error)
    }
  }
}

export const automaticPaymentService = new AutomaticPaymentService()
