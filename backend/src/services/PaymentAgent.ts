import { ethers } from 'ethers'
import { DatabaseService, Subscription } from './DatabaseService'
import { logger } from '../utils/logger'

export class PaymentAgent {
  private provider: ethers.JsonRpcProvider
  private wallet: ethers.Wallet
  private databaseService: DatabaseService

  // ERC-20 ABI for token transfers
  private readonly ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
  ]

  // Common token addresses on Base network
  private readonly TOKEN_ADDRESSES: { [key: string]: string } = {
    'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
    'ETH': '0x0000000000000000000000000000000000000000', // Native ETH
    'cbBTC': '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', // Coinbase Wrapped BTC
    'DAI': '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'  // DAI on Base
  }

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService
    
    const rpcUrl = process.env.BASE_RPC_URL!
    const privateKey = process.env.PRIVATE_KEY!
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl)
    this.wallet = new ethers.Wallet(privateKey, this.provider)
  }

  async initialize() {
    logger.info('Initializing payment agent...')
    
    // Verify wallet connection
    try {
      const balance = await this.provider.getBalance(this.wallet.address)
      logger.info(`Agent wallet: ${this.wallet.address}`)
      logger.info(`Agent ETH balance: ${ethers.formatEther(balance)} ETH`)
      
      // Check if we have enough ETH for gas
      const minEthBalance = ethers.parseEther('0.01') // 0.01 ETH minimum
      if (balance < minEthBalance) {
        logger.warn('Low ETH balance - may not be able to process payments')
      }
    } catch (error) {
      throw new Error(`Failed to connect to Base network: ${error}`)
    }
    
    logger.info('Payment agent initialized successfully')
  }

  async processPayments() {
    logger.info('Starting payment processing cycle...')
    
    try {
      const dueSubscriptions = await this.databaseService.getDueSubscriptions()
      
      if (dueSubscriptions.length === 0) {
        logger.info('No payments due at this time')
        return
      }

      logger.info(`Processing ${dueSubscriptions.length} due payments...`)

      for (const subscription of dueSubscriptions) {
        try {
          await this.processSubscriptionPayment(subscription)
        } catch (error) {
          logger.error(`Failed to process subscription ${subscription.id}:`, error)
          
          // Log the failed payment
          await this.databaseService.logPayment({
            subscription_id: subscription.id,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            amount: subscription.token_amount,
            token_symbol: subscription.token_symbol
          })
        }
      }
    } catch (error) {
      logger.error('Error in payment processing cycle:', error)
    }
  }

  private async processSubscriptionPayment(subscription: Subscription) {
    logger.info(`Processing payment for subscription ${subscription.id}`)
    
    try {
      let transactionHash: string

      if (subscription.token_symbol === 'ETH') {
        transactionHash = await this.sendEthPayment(subscription)
      } else {
        transactionHash = await this.sendTokenPayment(subscription)
      }

      // Log successful payment
      await this.databaseService.logPayment({
        subscription_id: subscription.id,
        transaction_hash: transactionHash,
        status: 'success',
        amount: subscription.token_amount,
        token_symbol: subscription.token_symbol
      })

      // Update next payment date
      const nextPaymentDate = this.databaseService.getNextPaymentDate(subscription.frequency)
      await this.databaseService.updateNextPaymentDate(subscription.id, nextPaymentDate)

      logger.info(`Payment successful for subscription ${subscription.id}. TX: ${transactionHash}`)
      
    } catch (error) {
      logger.error(`Payment failed for subscription ${subscription.id}:`, error)
      
      // Check if we should pause the subscription after multiple failures
      await this.handlePaymentFailure(subscription, error)
      
      throw error
    }
  }

  private async sendEthPayment(subscription: Subscription): Promise<string> {
    const amount = ethers.parseEther(subscription.token_amount.toString())
    
    // Check if we have enough ETH
    const balance = await this.provider.getBalance(this.wallet.address)
    const gasEstimate = await this.provider.estimateGas({
      to: subscription.recipient_address,
      value: amount
    })
    const gasPrice = await this.provider.getFeeData()
    const gasCost = gasEstimate * (gasPrice.gasPrice || 0n)
    
    if (balance < amount + gasCost) {
      throw new Error('Insufficient ETH balance for payment + gas')
    }

    const tx = await this.wallet.sendTransaction({
      to: subscription.recipient_address,
      value: amount,
      gasLimit: gasEstimate,
      gasPrice: gasPrice.gasPrice
    })

    const receipt = await tx.wait()
    if (!receipt || receipt.status === 0) {
      throw new Error('Transaction failed')
    }

    return tx.hash
  }

  private async sendTokenPayment(subscription: Subscription): Promise<string> {
    const tokenAddress = this.TOKEN_ADDRESSES[subscription.token_symbol]
    if (!tokenAddress) {
      throw new Error(`Unsupported token: ${subscription.token_symbol}`)
    }

    const tokenContract = new ethers.Contract(tokenAddress, this.ERC20_ABI, this.wallet)
    
    // Get token decimals
    const decimals = await tokenContract.decimals()
    const amount = ethers.parseUnits(subscription.token_amount.toString(), decimals)
    
    // Check token balance
    const balance = await tokenContract.balanceOf(this.wallet.address)
    if (balance < amount) {
      throw new Error(`Insufficient ${subscription.token_symbol} balance`)
    }

    // Send the transaction
    const tx = await tokenContract.transfer(subscription.recipient_address, amount)
    const receipt = await tx.wait()
    
    if (!receipt || receipt.status === 0) {
      throw new Error('Token transfer failed')
    }

    return tx.hash
  }

  private async handlePaymentFailure(subscription: Subscription, error: Error | unknown) {
    // You could implement logic here to:
    // 1. Count consecutive failures
    // 2. Pause subscription after X failures
    // 3. Send email notifications
    // 4. Implement retry logic with exponential backoff
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // For now, just log the error
    logger.error(`Payment failure for subscription ${subscription.id}: ${errorMessage}`)
    
    // You could add more sophisticated error handling here
    // For example, pause after 3 consecutive failures:
    /*
    const failureCount = await this.getConsecutiveFailures(subscription.id)
    if (failureCount >= 3) {
      await this.databaseService.pauseSubscription(
        subscription.id, 
        `Paused after ${failureCount} consecutive failures`
      )
    }
    */
  }

  async getWalletBalance(tokenSymbol: string): Promise<string> {
    if (tokenSymbol === 'ETH') {
      const balance = await this.provider.getBalance(this.wallet.address)
      return ethers.formatEther(balance)
    } else {
      const tokenAddress = this.TOKEN_ADDRESSES[tokenSymbol]
      if (!tokenAddress) {
        throw new Error(`Unsupported token: ${tokenSymbol}`)
      }
      
      const tokenContract = new ethers.Contract(tokenAddress, this.ERC20_ABI, this.provider)
      const decimals = await tokenContract.decimals()
      const balance = await tokenContract.balanceOf(this.wallet.address)
      
      return ethers.formatUnits(balance, decimals)
    }
  }
}
