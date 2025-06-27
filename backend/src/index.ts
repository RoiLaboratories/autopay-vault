import dotenv from 'dotenv'
import cron from 'node-cron'
import { PaymentAgent } from './services/PaymentAgent'
import { DatabaseService } from './services/DatabaseService'
import { logger } from './utils/logger'

// Load environment variables
dotenv.config()

class AutoPayVaultAgent {
  private paymentAgent: PaymentAgent
  private databaseService: DatabaseService

  constructor() {
    this.databaseService = new DatabaseService()
    this.paymentAgent = new PaymentAgent(this.databaseService)
  }

  async start() {
    logger.info('Starting AutoPay Vault Agent...')

    // Validate configuration
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('Missing Supabase configuration')
    }

    if (!process.env.ETHEREUM_RPC_URL || !process.env.PRIVATE_KEY) {
      throw new Error('Missing Ethereum configuration')
    }

    // Initialize services
    await this.databaseService.initialize()
    await this.paymentAgent.initialize()

    // Schedule payment checks
    const checkInterval = process.env.AGENT_CHECK_INTERVAL || '*/5 * * * *' // Every 5 minutes
    
    cron.schedule(checkInterval, async () => {
      logger.info('Running scheduled payment check...')
      try {
        await this.paymentAgent.processPayments()
      } catch (error) {
        logger.error('Error processing payments:', error)
      }
    })

    logger.info(`Agent started successfully. Checking for payments every: ${checkInterval}`)
  }

  async stop() {
    logger.info('Stopping AutoPay Vault Agent...')
    // cron.destroy() is not available, tasks are automatically cleaned up
  }
}

// Start the agent
const agent = new AutoPayVaultAgent()

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...')
  await agent.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...')
  await agent.stop()
  process.exit(0)
})

// Start the agent
agent.start().catch((error) => {
  logger.error('Failed to start agent:', error)
  process.exit(1)
})

export default agent
