import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Subscription {
  id: string
  plan_id: string
  subscriber_address: string
  next_payment_due: string
  is_active: boolean
  created_at: string
  last_payment_at?: string
  contract_subscription_id?: string
  // Joined billing plan data
  billing_plans?: {
    name: string
    amount: number
    interval: number
    creator_address: string
    recipient_wallet: string
  }
}

export interface BillingPlan {
  plan_id: string
  creator_address: string
  name: string
  description?: string
  amount: number
  interval: number
  recipient_wallet: string
  is_active: boolean
  created_at: string
  max_subscribers?: number
  contract_plan_id?: string
}

export interface PaymentLog {
  id: string
  plan_subscription_id: string
  transaction_hash?: string
  amount: number
  status: 'success' | 'failed' | 'pending'
  error_message?: string
  created_at: string
}
