import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  id: string
  subscription_id: string
  transaction_hash?: string
  status: 'success' | 'failed' | 'pending'
  error_message?: string
  created_at: string
}
