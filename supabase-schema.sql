-- AutoPay Vault Database Schema
-- Run this in your Supabase SQL editor

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_address TEXT NOT NULL,
    recipient_address TEXT NOT NULL,
    token_amount DECIMAL(18,6) NOT NULL,
    token_symbol TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    next_payment_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_payment_date TIMESTAMPTZ,
    
    -- Indexes for better performance
    CONSTRAINT valid_addresses CHECK (
        user_address ~ '^0x[a-fA-F0-9]{40}$' AND 
        recipient_address ~ '^0x[a-fA-F0-9]{40}$'
    )
);

-- Create payment_logs table
CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    transaction_hash TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    amount DECIMAL(18,6) NOT NULL,
    token_symbol TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_address ON subscriptions(user_address);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_payment ON subscriptions(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_logs_subscription_id ON payment_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_status ON payment_logs(status);

-- Enable Row Level Security (RLS)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid()::text = user_address OR user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Users can only insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid()::text = user_address OR user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Users can only update their own subscriptions
CREATE POLICY "Users can update own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid()::text = user_address OR user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Payment logs policy - users can view logs for their subscriptions
CREATE POLICY "Users can view payment logs for own subscriptions" ON payment_logs
    FOR SELECT USING (
        subscription_id IN (
            SELECT id FROM subscriptions 
            WHERE user_address = auth.uid()::text OR user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

-- Service role can do everything (for the backend agent)
CREATE POLICY "Service role full access subscriptions" ON subscriptions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access payment_logs" ON payment_logs
    FOR ALL USING (auth.role() = 'service_role');
