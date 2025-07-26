-- Activity Logging Triggers for AutoPay Vault
-- Add these to your Supabase SQL editor

-- Function to log billing plan activities
CREATE OR REPLACE FUNCTION log_billing_plan_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_log (
            event_type,
            plan_id,
            actor_address,
            target_address,
            description,
            metadata
        ) VALUES (
            'plan_created',
            NEW.plan_id,
            NEW.creator_address,
            NEW.creator_address,
            'Created billing plan: ' || NEW.name,
            jsonb_build_object(
                'plan_name', NEW.name,
                'amount', NEW.amount,
                'interval', NEW.interval,
                'recipient_wallet', NEW.recipient_wallet
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO activity_log (
            event_type,
            plan_id,
            actor_address,
            target_address,
            description,
            metadata
        ) VALUES (
            'plan_updated',
            NEW.plan_id,
            NEW.creator_address,
            NEW.creator_address,
            'Updated billing plan: ' || NEW.name,
            jsonb_build_object(
                'plan_name', NEW.name,
                'old_amount', OLD.amount,
                'new_amount', NEW.amount,
                'old_active', OLD.is_active,
                'new_active', NEW.is_active
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO activity_log (
            event_type,
            plan_id,
            actor_address,
            target_address,
            description,
            metadata
        ) VALUES (
            'plan_deleted',
            OLD.plan_id,
            OLD.creator_address,
            OLD.creator_address,
            'Deleted billing plan: ' || OLD.name,
            jsonb_build_object(
                'plan_name', OLD.name,
                'amount', OLD.amount,
                'interval', OLD.interval
            )
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to log subscription activities
CREATE OR REPLACE FUNCTION log_subscription_activity()
RETURNS TRIGGER AS $$
DECLARE
    plan_name TEXT;
    plan_creator TEXT;
BEGIN
    -- Get plan details for the activity log
    SELECT bp.name, bp.creator_address 
    INTO plan_name, plan_creator
    FROM billing_plans bp 
    WHERE bp.plan_id = COALESCE(NEW.plan_id, OLD.plan_id);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_log (
            event_type,
            plan_id,
            plan_subscription_id,
            actor_address,
            target_address,
            description,
            metadata
        ) VALUES (
            'subscription_created',
            NEW.plan_id,
            NEW.id,
            NEW.subscriber_address,
            plan_creator,
            NEW.subscriber_address || ' subscribed to ' || COALESCE(plan_name, 'plan'),
            jsonb_build_object(
                'plan_name', plan_name,
                'subscriber_address', NEW.subscriber_address,
                'next_payment_due', NEW.next_payment_due
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log payment updates
        IF OLD.last_payment_at IS DISTINCT FROM NEW.last_payment_at AND NEW.last_payment_at IS NOT NULL THEN
            INSERT INTO activity_log (
                event_type,
                plan_id,
                plan_subscription_id,
                actor_address,
                target_address,
                description,
                metadata
            ) VALUES (
                'payment_success',
                NEW.plan_id,
                NEW.id,
                NEW.subscriber_address,
                plan_creator,
                'Payment received from ' || NEW.subscriber_address || ' for ' || COALESCE(plan_name, 'plan'),
                jsonb_build_object(
                    'plan_name', plan_name,
                    'subscriber_address', NEW.subscriber_address,
                    'payment_date', NEW.last_payment_at
                )
            );
        END IF;

        -- Log subscription status changes
        IF OLD.is_active != NEW.is_active THEN
            INSERT INTO activity_log (
                event_type,
                plan_id,
                plan_subscription_id,
                actor_address,
                target_address,
                description,
                metadata
            ) VALUES (
                CASE WHEN NEW.is_active THEN 'subscription_reactivated' ELSE 'subscription_cancelled' END,
                NEW.plan_id,
                NEW.id,
                NEW.subscriber_address,
                plan_creator,
                NEW.subscriber_address || CASE WHEN NEW.is_active THEN ' reactivated' ELSE ' cancelled' END || ' subscription to ' || COALESCE(plan_name, 'plan'),
                jsonb_build_object(
                    'plan_name', plan_name,
                    'subscriber_address', NEW.subscriber_address,
                    'old_status', OLD.is_active,
                    'new_status', NEW.is_active
                )
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO activity_log (
            event_type,
            plan_id,
            plan_subscription_id,
            actor_address,
            target_address,
            description,
            metadata
        ) VALUES (
            'subscription_deleted',
            OLD.plan_id,
            OLD.id,
            OLD.subscriber_address,
            plan_creator,
            OLD.subscriber_address || ' subscription to ' || COALESCE(plan_name, 'plan') || ' was deleted',
            jsonb_build_object(
                'plan_name', plan_name,
                'subscriber_address', OLD.subscriber_address
            )
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to log payment activities
CREATE OR REPLACE FUNCTION log_payment_activity()
RETURNS TRIGGER AS $$
DECLARE
    plan_name TEXT;
    plan_creator TEXT;
    subscriber_addr TEXT;
BEGIN
    -- Get subscription and plan details
    SELECT bp.name, bp.creator_address, ps.subscriber_address
    INTO plan_name, plan_creator, subscriber_addr
    FROM plan_subscriptions ps
    JOIN billing_plans bp ON bp.plan_id = ps.plan_id
    WHERE ps.id = NEW.plan_subscription_id;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_log (
            event_type,
            plan_id,
            plan_subscription_id,
            actor_address,
            target_address,
            description,
            metadata
        ) VALUES (
            CASE NEW.status 
                WHEN 'success' THEN 'payment_success'
                WHEN 'failed' THEN 'payment_failed'
                ELSE 'payment_pending'
            END,
            (SELECT plan_id FROM plan_subscriptions WHERE id = NEW.plan_subscription_id),
            NEW.plan_subscription_id,
            subscriber_addr,
            plan_creator,
            CASE NEW.status
                WHEN 'success' THEN 'Payment processed successfully for ' || COALESCE(plan_name, 'plan')
                WHEN 'failed' THEN 'Payment failed for ' || COALESCE(plan_name, 'plan')
                ELSE 'Payment pending for ' || COALESCE(plan_name, 'plan')
            END,
            jsonb_build_object(
                'plan_name', plan_name,
                'subscriber_address', subscriber_addr,
                'amount', NEW.amount,
                'token_symbol', NEW.token_symbol,
                'transaction_hash', NEW.transaction_hash,
                'error_message', NEW.error_message
            )
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS billing_plan_activity_trigger ON billing_plans;
CREATE TRIGGER billing_plan_activity_trigger
    AFTER INSERT OR UPDATE OR DELETE ON billing_plans
    FOR EACH ROW EXECUTE FUNCTION log_billing_plan_activity();

DROP TRIGGER IF EXISTS subscription_activity_trigger ON plan_subscriptions;
CREATE TRIGGER subscription_activity_trigger
    AFTER INSERT OR UPDATE OR DELETE ON plan_subscriptions
    FOR EACH ROW EXECUTE FUNCTION log_subscription_activity();

DROP TRIGGER IF EXISTS payment_activity_trigger ON payment_logs;
CREATE TRIGGER payment_activity_trigger
    AFTER INSERT ON payment_logs
    FOR EACH ROW EXECUTE FUNCTION log_payment_activity();

-- Backfill existing data (optional - run this once to populate activity log with existing data)
-- Insert activities for existing billing plans
INSERT INTO activity_log (event_type, plan_id, actor_address, target_address, description, metadata, created_at)
SELECT 
    'plan_created',
    plan_id,
    creator_address,
    creator_address,
    'Created billing plan: ' || name,
    jsonb_build_object(
        'plan_name', name,
        'amount', amount,
        'interval', interval,
        'recipient_wallet', recipient_wallet,
        'backfilled', true
    ),
    created_at
FROM billing_plans
WHERE plan_id NOT IN (SELECT DISTINCT plan_id FROM activity_log WHERE plan_id IS NOT NULL);

-- Insert activities for existing subscriptions
INSERT INTO activity_log (event_type, plan_id, plan_subscription_id, actor_address, target_address, description, metadata, created_at)
SELECT 
    'subscription_created',
    ps.plan_id,
    ps.id,
    ps.subscriber_address,
    bp.creator_address,
    ps.subscriber_address || ' subscribed to ' || bp.name,
    jsonb_build_object(
        'plan_name', bp.name,
        'subscriber_address', ps.subscriber_address,
        'next_payment_due', ps.next_payment_due,
        'backfilled', true
    ),
    ps.created_at
FROM plan_subscriptions ps
JOIN billing_plans bp ON bp.plan_id = ps.plan_id
WHERE ps.id NOT IN (SELECT DISTINCT plan_subscription_id FROM activity_log WHERE plan_subscription_id IS NOT NULL);
