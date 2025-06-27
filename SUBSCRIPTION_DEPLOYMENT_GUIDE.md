# AutoPay Vault USDC Subscription System - Deployment Guide

## 🚀 Complete Implementation Overview

This implementation adds a comprehensive USDC-based subscription system to AutoPay Vault with:

- **Smart Contract**: Secure USDC payments on Base network
- **React Frontend**: Beautiful pricing page with feature gating
- **State Management**: Global subscription context with plan limits
- **UX Enhancements**: Toast notifications and animated UI

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **NPM** or **Yarn**
3. **Metamask** or **Coinbase Wallet**
4. **USDC on Base** network for testing
5. **Vercel Account** for deployment

## 🏗️ Smart Contract Deployment

### 1. Install Contract Dependencies

```bash
cd contracts
npm install
```

### 2. Configure Environment

Create `contracts/.env`:
```bash
# Private key for deployment (no 0x prefix)
PRIVATE_KEY=your_private_key_here

# Base network RPC
BASE_RPC_URL=https://mainnet.base.org

# Treasury address to receive USDC payments
TREASURY_ADDRESS=your_treasury_wallet_address

# Optional: Basescan API key for verification
BASESCAN_API_KEY=your_basescan_api_key
```

### 3. Compile Contracts

```bash
npx hardhat compile
```

### 4. Run Tests (Optional)

```bash
npx hardhat test
```

### 5. Deploy to Base Network

**Testnet (Base Goerli):**
```bash
npx hardhat run scripts/deploy.js --network baseTestnet
```

**Mainnet (Base):**
```bash
npx hardhat run scripts/deploy.js --network base
```

The deployment script will:
- Deploy the SubscriptionManager contract
- Save deployment info to `deployments/` folder
- Automatically verify the contract on Basescan

### 6. Update Environment Variables

After deployment, update your frontend `.env` file:
```bash
# Add the deployed contract address
VITE_SUBSCRIPTION_CONTRACT_ADDRESS=0x...deployed_contract_address
VITE_USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

## 🌐 Frontend Deployment

### 1. Install Frontend Dependencies

```bash
cd .. # Back to root directory
npm install
```

### 2. Update Environment Variables

Update `.env` with your deployed contract address and API URLs:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration
VITE_API_URL=https://your-backend-api.vercel.app

# Smart Contracts
VITE_SUBSCRIPTION_CONTRACT_ADDRESS=0x...your_deployed_contract
VITE_USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Network Configuration
VITE_NETWORK_NAME=base
VITE_CHAIN_ID=8453
VITE_BASE_RPC_URL=https://mainnet.base.org
```

### 3. Build and Deploy Frontend

```bash
npm run build
vercel --prod
```

## 🛠️ Backend API Deployment

### 1. Deploy Backend API

```bash
cd backend
npm install
vercel --prod
```

### 2. Set Backend Environment Variables

In Vercel dashboard for your backend project, add:
```bash
# Frontend URLs for CORS
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGIN=https://your-frontend.vercel.app

# Supabase (Service Key)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Base Network
BASE_RPC_URL=https://mainnet.base.org
PRIVATE_KEY=your_private_key
```

## 🎯 Features Overview

### Subscription Plans

**Free Plan:**
- 1 active subscription
- Basic wallet connection
- Community support

**Pro Plan ($10/month):**
- 25 active subscriptions
- Advanced analytics
- Email notifications
- Priority support
- API access

**Enterprise Plan ($50/month):**
- Unlimited subscriptions
- Custom integrations
- Dedicated account manager
- 24/7 priority support

### Smart Contract Features

- **Secure USDC Payments**: OpenZeppelin security standards
- **Flexible Subscriptions**: 1-24 month options
- **Annual Discounts**: 20% off for 12+ month subscriptions
- **Subscription Extensions**: Existing subscriptions are extended, not replaced
- **Admin Controls**: Price updates, treasury management
- **Emergency Functions**: Admin can extend subscriptions if needed

### Frontend Features

- **Responsive Pricing Page**: Beautiful 3-tier layout
- **Feature Gating**: Components automatically check subscription status
- **Limit Enforcement**: Subscription and client limits based on plan
- **Plan Badge**: Shows current subscription status in header
- **Subscription Modal**: Seamless USDC approval and payment flow
- **Toast Notifications**: User feedback for all actions

## 🧪 Testing the Implementation

### 1. Test Smart Contract

```bash
cd contracts
npx hardhat test
```

### 2. Test Frontend

1. Connect your wallet to Base network
2. Navigate to the Pricing page
3. Try subscribing to Pro plan
4. Verify plan badge updates in header
5. Test feature gating on restricted features

### 3. Test USDC Flow

1. Ensure you have USDC on Base network
2. Select subscription duration (1, 6, or 12 months)
3. Approve USDC spending
4. Complete subscription transaction
5. Verify subscription status in contract

## 🔧 Customization Options

### Modify Subscription Prices

In the smart contract:
```solidity
// Update the default price (currently $10 USDC)
uint256 public pricePerMonth = 15 * 10**6; // $15 USDC per month
```

Or use the admin function after deployment:
```javascript
// Call setPricePerMonth as contract owner
await subscriptionManager.setPricePerMonth(ethers.parseUnits("15", 6));
```

### Add New Plan Tiers

In `SubscriptionContext.tsx`, update the `PLAN_LIMITS` object:
```typescript
const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  // Add new tiers here
  premium: {
    maxSubscriptions: 100,
    maxClients: 100,
    features: ['all_features', 'premium_support']
  }
}
```

### Customize Feature Gates

Wrap any component with feature gating:
```jsx
<FeatureGate feature="analytics" requiredPlan="pro">
  <AnalyticsComponent />
</FeatureGate>
```

## 📊 Monitoring and Analytics

### Contract Events

Monitor these events for subscription analytics:
- `Subscribed(address user, uint256 expiry, uint256 months)`
- `PriceUpdated(uint256 newPrice)`
- `TreasuryUpdated(address newTreasury)`

### User Analytics

Track user subscription behavior in your backend:
- Subscription conversions by plan
- Average subscription duration
- Churn rate and renewals
- Feature usage by plan tier

## 🔒 Security Considerations

1. **Private Keys**: Never commit private keys to version control
2. **Environment Variables**: Use Vercel's environment variable system
3. **Smart Contract**: Audited OpenZeppelin contracts used
4. **CORS**: Properly configured for production domains
5. **Rate Limiting**: Consider implementing rate limiting for API endpoints

## 🚀 Going Live Checklist

- [ ] Smart contract deployed and verified on Base
- [ ] Frontend deployed with correct contract address
- [ ] Backend API deployed with proper CORS settings
- [ ] Environment variables set in Vercel
- [ ] Test subscription flow with real USDC
- [ ] Monitor contract for subscription events
- [ ] Set up analytics tracking
- [ ] Configure error monitoring (Sentry, etc.)

## 🆘 Troubleshooting

### Common Issues

1. **Contract not found**: Verify contract address in environment variables
2. **CORS errors**: Check backend CORS settings and frontend URL
3. **USDC approval fails**: Ensure user has sufficient USDC and gas
4. **Transaction fails**: Check Base network status and gas prices

### Getting Help

- Check the Hardhat console for contract deployment issues
- Use browser dev tools to debug frontend issues
- Monitor Vercel function logs for backend API issues
- Test on Base testnet first before mainnet deployment

---

🎉 **Congratulations!** You now have a fully functional USDC subscription system integrated with AutoPay Vault!
