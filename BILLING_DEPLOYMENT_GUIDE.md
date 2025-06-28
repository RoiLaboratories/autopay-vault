# AutoPay Vault - Deployment Guide

This guide covers deploying the BillingPlanManager contract and integrating it with your frontend application.

## Prerequisites

1. **Environment Setup**
   - Node.js 18+ installed
   - Metamask or Coinbase Wallet extension
   - Base network added to your wallet
   - USDC on Base for testing

2. **Required Accounts**
   - Supabase account with a project
   - Base network wallet with ETH for gas
   - Vercel account for backend deployment (optional)

## Part 1: Database Setup

### 1. Deploy Supabase Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Execute the SQL to create all tables and policies

### 2. Configure Environment Variables

Create `.env` file in the root directory:

```bash
# Copy from .env.example and fill in your values
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Network Configuration
VITE_NETWORK_NAME=base
VITE_CHAIN_ID=8453
VITE_BASE_RPC_URL=https://mainnet.base.org

# Contract Addresses (will be filled after deployment)
VITE_SUBSCRIPTION_CONTRACT_ADDRESS=
VITE_BILLING_PLAN_MANAGER_ADDRESS=
VITE_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

Create `backend/.env` file:

```bash
# Copy from backend/.env.example and fill in your values
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Network Configuration
BASE_RPC_URL=https://mainnet.base.org
PRIVATE_KEY=your_ethereum_private_key_for_backend
NETWORK_NAME=base
CHAIN_ID=8453

# Contract Addresses (will be filled after deployment)
SUBSCRIPTION_CONTRACT_ADDRESS=
BILLING_PLAN_MANAGER_ADDRESS=
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

## Part 2: Smart Contract Deployment

### 1. Deploy BillingPlanManager Contract

Navigate to the contracts directory:

```bash
cd contracts
```

Install dependencies:

```bash
npm install
```

Create `contracts/.env` file:

```bash
PRIVATE_KEY=your_ethereum_private_key
BASE_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=your_basescan_api_key # Optional for verification
```

Deploy to Base mainnet:

```bash
npx hardhat run scripts/deploy-billing-plan.js --network base
```

For testnet deployment (Base Sepolia):

```bash
npx hardhat run scripts/deploy-billing-plan.js --network base-sepolia
```

### 2. Update Environment Variables

After deployment, update your environment files with the contract addresses:

1. Copy the `BillingPlanManager` address from the deployment output
2. Update `VITE_BILLING_PLAN_MANAGER_ADDRESS` in root `.env`
3. Update `BILLING_PLAN_MANAGER_ADDRESS` in `backend/.env`

## Part 3: Backend Deployment

### Option A: Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy the backend:
   ```bash
   cd backend
   vercel
   ```

3. Set environment variables in Vercel dashboard or via CLI:
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add BILLING_PLAN_MANAGER_ADDRESS
   # ... add all other environment variables
   ```

### Option B: Self-hosted Deployment

1. Build the backend:
   ```bash
   cd backend
   npm run build
   ```

2. Deploy to your preferred hosting platform
3. Ensure environment variables are configured

## Part 4: Frontend Deployment

### 1. Install Dependencies

```bash
npm install
```

### 2. Build and Deploy

For Vercel:

```bash
npm run build
vercel
```

For Netlify:

```bash
npm run build
# Upload dist/ folder to Netlify
```

For self-hosting:

```bash
npm run build
# Deploy dist/ folder to your web server
```

## Part 5: Testing the Integration

### 1. Test Plan Creation

1. Connect your wallet to the application
2. Navigate to Company Dashboard → Billing Plans
3. Create a test billing plan
4. Verify the plan appears in both the UI and Supabase

### 2. Test Subscription Flow

1. Copy the subscription link from a created plan
2. Open the link in a new browser/wallet
3. Connect a different wallet with USDC
4. Subscribe to the plan
5. Verify the subscription in the contract and database

### 3. Test Payment Processing

1. Use the backend API or contract directly to process a payment
2. Verify the payment is recorded in the database
3. Check that the next payment date is updated

## Part 6: Production Configuration

### 1. Security Checklist

- [ ] Use strong private keys for contract deployment
- [ ] Enable Row Level Security in Supabase
- [ ] Configure CORS properly for your domain
- [ ] Use environment variables for all sensitive data
- [ ] Enable API rate limiting
- [ ] Configure proper SSL certificates

### 2. Monitoring Setup

1. Set up Supabase monitoring for database performance
2. Configure error tracking (e.g., Sentry)
3. Set up uptime monitoring for your API endpoints
4. Monitor contract events on Base

### 3. Backup Strategy

1. Regular database backups via Supabase
2. Contract source code backup
3. Environment variables backup (securely)

## API Endpoints

After deployment, your backend will expose these endpoints:

- `GET /api/billing-plans?creatorAddress={address}` - Get plans for a creator
- `POST /api/billing-plans` - Create a new billing plan
- `PUT /api/billing-plans` - Update a billing plan
- `DELETE /api/billing-plans?planId={id}&creatorAddress={address}` - Delete a plan
- `GET /api/billing-plans/{planId}` - Get a specific plan (for subscription page)
- `GET /api/plan-subscriptions?subscriberAddress={address}` - Get user subscriptions
- `POST /api/plan-subscriptions` - Create a subscription
- `PUT /api/plan-subscriptions` - Process a payment
- `DELETE /api/plan-subscriptions` - Cancel a subscription

## Frontend Routes

- `/` - Main application (landing, dashboard, etc.)
- `/subscribe/{planId}` - Public subscription page for a specific plan

## Troubleshooting

### Common Issues

1. **Contract deployment fails**
   - Check you have enough ETH for gas
   - Verify RPC URL is correct
   - Ensure private key is valid

2. **Frontend can't connect to contract**
   - Verify contract address in environment variables
   - Check network configuration
   - Ensure ABI is up to date

3. **API endpoints return 500 errors**
   - Check backend environment variables
   - Verify Supabase connection
   - Check server logs

4. **Subscription page not loading**
   - Verify React Router configuration
   - Check if plan exists in database
   - Verify API endpoint is accessible

### Getting Help

1. Check the console for error messages
2. Verify all environment variables are set
3. Test API endpoints directly with curl/Postman
4. Check Supabase logs for database errors
5. Verify contract on Base block explorer

## Additional Resources

- [Base Network Documentation](https://docs.base.org/)
- [Supabase Documentation](https://supabase.com/docs)
- [Hardhat Documentation](https://hardhat.org/docs)
- [React Router Documentation](https://reactrouter.com/)

## Support

For issues related to this deployment, please check:
1. Environment variable configuration
2. Network connectivity
3. Contract deployment status
4. Database table creation
5. API endpoint accessibility
