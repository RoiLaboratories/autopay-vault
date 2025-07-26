import { ethers } from 'ethers'
import { Contract } from 'ethers'

// Contract ABI
const BILLING_PLAN_MANAGER_ABI = [
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

// USDC Contract ABI (for approvals)
const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
]

// Contract addresses
const BILLING_PLAN_MANAGER_ADDRESS = import.meta.env.VITE_BILLING_PLAN_MANAGER_ADDRESS || ''
const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base USDC

export interface BillingPlanContract {
  planId: string
  creator: string
  name: string
  amount: bigint
  interval: bigint
  recipientWallet: string
  isActive: boolean
  createdAt: bigint
}

export interface SubscriptionContract {
  planId: string
  subscriber: string
  nextPaymentDue: bigint
  isActive: boolean
  createdAt: bigint
  lastPayment: bigint
}

export class BillingPlanService {
  private contract: Contract | null = null
  private usdcContract: Contract | null = null
  private signer: ethers.JsonRpcSigner | null = null

  async initialize(provider: ethers.BrowserProvider) {
    this.signer = await provider.getSigner()
    
    this.contract = new ethers.Contract(
      BILLING_PLAN_MANAGER_ADDRESS,
      BILLING_PLAN_MANAGER_ABI,
      this.signer
    )

    this.usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      USDC_ABI,
      this.signer
    )
  }

  async createPlan(
    planId: string,
    name: string,
    amount: number,
    interval: 'monthly' | 'yearly',
    recipientWallet: string
  ): Promise<{ txHash: string }> {
    if (!this.contract) throw new Error('Contract not initialized')

    const amountWei = ethers.parseUnits(amount.toString(), 6) // USDC has 6 decimals
    const intervalSeconds = interval === 'monthly' ? 2592000 : 31536000 // 30 days or 365 days

    const tx = await this.contract.createPlan(
      planId,
      name,
      amountWei,
      intervalSeconds,
      recipientWallet
    )

    await tx.wait()
    return { txHash: tx.hash }
  }

  async updatePlan(
    planId: string,
    name: string,
    amount: number,
    recipientWallet: string
  ): Promise<{ txHash: string }> {
    if (!this.contract) throw new Error('Contract not initialized')

    const amountWei = ethers.parseUnits(amount.toString(), 6)

    const tx = await this.contract.updatePlan(
      planId,
      name,
      amountWei,
      recipientWallet
    )

    await tx.wait()
    return { txHash: tx.hash }
  }

  async deactivatePlan(planId: string): Promise<{ txHash: string }> {
    if (!this.contract) throw new Error('Contract not initialized')

    const tx = await this.contract.deactivatePlan(planId)
    await tx.wait()
    return { txHash: tx.hash }
  }

  async subscribe(planId: string): Promise<{ txHash: string }> {
    if (!this.contract || !this.usdcContract) throw new Error('Contract not initialized')

    // Get plan details
    const plan = await this.getPlan(planId)
    if (!plan.isActive) throw new Error('Plan is not active')

    // Check USDC balance
    const balance = await this.usdcContract.balanceOf(await this.signer!.getAddress())
    if (balance < plan.amount) {
      throw new Error('Insufficient USDC balance')
    }

    // Check and approve USDC if needed
    const allowance = await this.usdcContract.allowance(
      await this.signer!.getAddress(),
      BILLING_PLAN_MANAGER_ADDRESS
    )

    if (allowance < plan.amount) {
      const approveTx = await this.usdcContract.approve(
        BILLING_PLAN_MANAGER_ADDRESS,
        plan.amount
      )
      await approveTx.wait()
    }

    // Subscribe to plan
    const tx = await this.contract.subscribe(planId)
    await tx.wait()
    return { txHash: tx.hash }
  }

  async processPayment(planId: string, subscriber: string): Promise<{ txHash: string }> {
    if (!this.contract) throw new Error('Contract not initialized')

    const tx = await this.contract.processPayment(planId, subscriber)
    await tx.wait()
    return { txHash: tx.hash }
  }

  async cancelSubscription(planId: string): Promise<{ txHash: string }> {
    if (!this.contract) throw new Error('Contract not initialized')

    const tx = await this.contract.cancelSubscription(planId)
    await tx.wait()
    return { txHash: tx.hash }
  }

  async getPlan(planId: string): Promise<BillingPlanContract> {
    if (!this.contract) throw new Error('Contract not initialized')

    const plan = await this.contract.getPlan(planId)
    return {
      planId: plan.planId,
      creator: plan.creator,
      name: plan.name,
      amount: plan.amount,
      interval: plan.interval,
      recipientWallet: plan.recipientWallet,
      isActive: plan.isActive,
      createdAt: plan.createdAt
    }
  }

  async getUserPlans(userAddress: string): Promise<string[]> {
    if (!this.contract) throw new Error('Contract not initialized')

    return await this.contract.getUserPlans(userAddress)
  }

  async getPlanSubscriptions(planId: string): Promise<SubscriptionContract[]> {
    if (!this.contract) throw new Error('Contract not initialized')

    const subscriptions = await this.contract.getPlanSubscriptions(planId)
    return subscriptions.map((sub: any) => ({
      planId: sub.planId,
      subscriber: sub.subscriber,
      nextPaymentDue: sub.nextPaymentDue,
      isActive: sub.isActive,
      createdAt: sub.createdAt,
      lastPayment: sub.lastPayment
    }))
  }

  async getSubscription(userAddress: string, planId: string): Promise<SubscriptionContract> {
    if (!this.contract) throw new Error('Contract not initialized')

    const subscription = await this.contract.getSubscription(userAddress, planId)
    return {
      planId: subscription.planId,
      subscriber: subscription.subscriber,
      nextPaymentDue: subscription.nextPaymentDue,
      isActive: subscription.isActive,
      createdAt: subscription.createdAt,
      lastPayment: subscription.lastPayment
    }
  }

  async hasActiveSubscription(userAddress: string, planId: string): Promise<boolean> {
    if (!this.contract) throw new Error('Contract not initialized')

    return await this.contract.hasActiveSubscription(userAddress, planId)
  }

  async getUsdcBalance(userAddress: string): Promise<string> {
    if (!this.usdcContract) throw new Error('USDC contract not initialized')

    const balance = await this.usdcContract.balanceOf(userAddress)
    return ethers.formatUnits(balance, 6)
  }

  async getUsdcAllowance(userAddress: string): Promise<string> {
    if (!this.usdcContract) throw new Error('USDC contract not initialized')

    const allowance = await this.usdcContract.allowance(userAddress, BILLING_PLAN_MANAGER_ADDRESS)
    return ethers.formatUnits(allowance, 6)
  }
}

export const billingPlanService = new BillingPlanService()
