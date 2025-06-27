import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../utils/logger'

export interface Subscription {
  id: string
  user_address: string
  recipient_address: string
  token_amount: number
  token_symbol: string
  frequency: 'daily' | 'weekly' | 'monthly'
  next_payment_date: string
  status: 'active' | 'paused' | 'cancelled'
  created_at: string
  last_payment_date?: string
}

export interface PaymentLog {
  id?: string
  subscription_id: string
  transaction_hash?: string
  status: 'success' | 'failed' | 'pending'
  error_message?: string
  amount: number
  token_symbol: string
  created_at?: string
}

export class DatabaseService {
  private supabase: SupabaseClient

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!
    
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async initialize() {
    logger.info('Initializing database service...')
    
    // Test connection
    const { error } = await this.supabase.from('subscriptions').select('count').limit(1)
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`)
    }
    
    logger.info('Database service initialized successfully')
  }

  async getDueSubscriptions(): Promise<Subscription[]> {
    const now = new Date().toISOString()
    
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('next_payment_date', now)

    if (error) {
      logger.error('Error fetching due subscriptions:', error)
      throw error
    }

    logger.info(`Found ${data?.length || 0} due subscriptions`)
    return data || []
  }

  async updateNextPaymentDate(subscriptionId: string, nextPaymentDate: Date) {
    const { error } = await this.supabase
      .from('subscriptions')
      .update({
        next_payment_date: nextPaymentDate.toISOString(),
        last_payment_date: new Date().toISOString()
      })
      .eq('id', subscriptionId)

    if (error) {
      logger.error(`Error updating subscription ${subscriptionId}:`, error)
      throw error
    }

    logger.info(`Updated next payment date for subscription ${subscriptionId}`)
  }

  async logPayment(paymentLog: PaymentLog) {
    const { error } = await this.supabase
      .from('payment_logs')
      .insert({
        ...paymentLog,
        created_at: new Date().toISOString()
      })

    if (error) {
      logger.error('Error logging payment:', error)
      throw error
    }

    logger.info(`Payment logged for subscription ${paymentLog.subscription_id}`)
  }

  async pauseSubscription(subscriptionId: string, reason: string) {
    const { error } = await this.supabase
      .from('subscriptions')
      .update({ status: 'paused' })
      .eq('id', subscriptionId)

    if (error) {
      logger.error(`Error pausing subscription ${subscriptionId}:`, error)
      throw error
    }

    logger.warn(`Paused subscription ${subscriptionId}: ${reason}`)
  }

  private calculateNextPaymentDate(frequency: string, lastDate: Date): Date {
    const nextDate = new Date(lastDate)
    
    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1)
        break
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7)
        break
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
      default:
        throw new Error(`Unknown frequency: ${frequency}`)
    }
    
    return nextDate
  }

  getNextPaymentDate(frequency: string, lastDate?: Date): Date {
    const baseDate = lastDate || new Date()
    return this.calculateNextPaymentDate(frequency, baseDate)
  }
}
