-- AutoPay Vault Database Schema
-- Run this in your Supabase SQL editor

-- Create billing_plans table
CREATE TABLE IF NOT EXISTS billing_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id TEXT NOT NULL UNIQUE,
    creator_address TEXT NOT NULL,
    name TEXT NOT NULL,
    amount DECIMAL(18,6) NOT NULL,
    interval TEXT NOT NULL CHECK (interval IN ('monthly', 'yearly')),
    recipient_wallet TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contract integration fields
    contract_address TEXT,
    contract_plan_id TEXT,
    
    CONSTRAINT valid_creator_address CHECK (creator_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT valid_recipient_address CHECK (recipient_wallet ~ '^0x[a-fA-F0-9]{40}$')
);

-- Create plan_subscriptions table
CREATE TABLE IF NOT EXISTS plan_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES billing_plans(plan_id) ON DELETE CASCADE,
    subscriber_address TEXT NOT NULL,
    next_payment_due TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_payment_at TIMESTAMPTZ,
    
    -- Contract integration fields
    contract_subscription_id TEXT,
    
    CONSTRAINT valid_subscriber_address CHECK (subscriber_address ~ '^0x[a-fA-F0-9]{40}$'),
    UNIQUE(plan_id, subscriber_address)
);

-- Create payment_logs table
CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_subscription_id UUID NOT NULL REFERENCES plan_subscriptions(id) ON DELETE CASCADE,
    transaction_hash TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    amount DECIMAL(18,6) NOT NULL,
    token_symbol TEXT NOT NULL DEFAULT 'USDC',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL, -- e.g. 'subscription_created', 'payment_success', 'plan_created', etc.
    plan_id TEXT,
    plan_subscription_id UUID,
    actor_address TEXT, -- who performed the action
    target_address TEXT, -- e.g. subscriber or recipient
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_billing_plans_creator_address ON billing_plans(creator_address);
CREATE INDEX IF NOT EXISTS idx_billing_plans_plan_id ON billing_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_billing_plans_is_active ON billing_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plan_subscriptions_plan_id ON plan_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_subscriptions_subscriber ON plan_subscriptions(subscriber_address);
CREATE INDEX IF NOT EXISTS idx_plan_subscriptions_next_payment ON plan_subscriptions(next_payment_due);
CREATE INDEX IF NOT EXISTS idx_payment_logs_plan_subscription_id ON payment_logs(plan_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_status ON payment_logs(status);
CREATE INDEX IF NOT EXISTS idx_activity_log_plan_id ON activity_log(plan_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_address ON activity_log(actor_address);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for billing_plans
-- Users can view all active billing plans (for subscription purposes)
CREATE POLICY "Anyone can view active billing plans" ON billing_plans
    FOR SELECT USING (is_active = true);

-- Users can only manage their own billing plans
CREATE POLICY "Users can manage own billing plans" ON billing_plans
    FOR ALL USING (creator_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Create RLS policies for plan_subscriptions
-- Users can view subscriptions for their plans or their own subscriptions
CREATE POLICY "Users can view relevant plan subscriptions" ON plan_subscriptions
    FOR SELECT USING (
        subscriber_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
        plan_id IN (SELECT plan_id FROM billing_plans WHERE creator_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    );

-- Users can create subscriptions to any active plan
CREATE POLICY "Users can create plan subscriptions" ON plan_subscriptions
    FOR INSERT WITH CHECK (
        subscriber_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' AND
        plan_id IN (SELECT plan_id FROM billing_plans WHERE is_active = true)
    );

-- Users can update their own subscriptions
CREATE POLICY "Users can update own plan subscriptions" ON plan_subscriptions
    FOR UPDATE USING (subscriber_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Payment logs policy - users can view logs for their plan subscriptions
CREATE POLICY "Users can view payment logs for own subscriptions" ON payment_logs
    FOR SELECT USING (
        plan_subscription_id IN (
            SELECT id FROM plan_subscriptions 
            WHERE subscriber_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
            plan_id IN (SELECT plan_id FROM billing_plans WHERE creator_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
        )
    );

-- Activity log policy - users can view their own activity logs
CREATE POLICY "Users can view own activity logs" ON activity_log
    FOR SELECT USING (actor_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Service role can do everything (for the backend agent)
CREATE POLICY "Service role full access billing_plans" ON billing_plans
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access plan_subscriptions" ON plan_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access payment_logs" ON payment_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access activity_log" ON activity_log
    FOR ALL USING (auth.role() = 'service_role');

-- Create triggers for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_billing_plans_updated_at BEFORE UPDATE ON billing_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create functions for plan management
CREATE OR REPLACE FUNCTION get_user_plan_limits(user_tier TEXT)
RETURNS INTEGER AS $$
BEGIN
    CASE user_tier
        WHEN 'free' THEN RETURN 3;
        WHEN 'pro' THEN RETURN 50;
        WHEN 'enterprise' THEN RETURN 999999; -- Effectively unlimited
        ELSE RETURN 3;
    END CASE;
END;
$$ LANGUAGE plpgsql;
