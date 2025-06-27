# AutoPay Vault Development Setup

## Quick Start

1. **Clone and Install Dependencies**
   ```bash
   # Frontend
   npm install
   
   # Backend
   cd backend
   npm install
   cd ..
   ```

2. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL schema in `supabase-schema.sql`
   - Get your project URL and service key

3. **Configure Environment Variables**
   ```bash
   # Frontend - copy and update
   cp .env.example .env
   
   # Backend - copy and update
   cp backend/.env.example backend/.env
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1 - Frontend
   npm run dev
   
   # Terminal 2 - Backend Agent
   cd backend
   npm run dev
   ```

## Environment Setup

### Frontend (.env)
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend (backend/.env)
```bash
NODE_ENV=development
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your_infura_id
PRIVATE_KEY=your_wallet_private_key
PAYMENT_CHECK_INTERVAL=*/5 * * * *
LOG_LEVEL=info
```

## Features

### ✅ Completed
- **Frontend**: React + Vite + TailwindCSS + Framer Motion
- **Wallet Integration**: Coinbase Wallet SDK
- **UI Components**: ShadCN components with dark theme
- **Database**: Supabase integration
- **Backend Agent**: Autonomous payment processing
- **Animations**: Smooth transitions and hover effects

### 🎨 UI Components
- **Landing Page**: Animated hero with gradient text
- **Wallet Connect**: Coinbase Wallet integration
- **Subscription Form**: Create recurring payments
- **Dashboard**: View and manage active subscriptions
- **Glass Morphism**: Modern UI effects

### 🤖 Backend Agent
- **Payment Processing**: Automatic ETH/ERC-20 transfers
- **Scheduling**: Cron-based payment execution
- **Error Handling**: Retry logic and failure notifications
- **Logging**: Comprehensive payment tracking

## Architecture

```
AutoPay Vault/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/             # Custom hooks
│   └── lib/               # Utilities & Supabase
├── backend/               # Node.js agent
│   └── src/
│       ├── services/      # Core business logic
│       └── utils/         # Utilities
└── supabase-schema.sql    # Database schema
```

## Usage

1. **Connect Wallet**: Users connect their Coinbase Wallet
2. **Create Subscription**: Set recipient, amount, frequency
3. **Autonomous Payments**: Backend agent processes payments automatically
4. **Monitor**: View payment history and manage subscriptions

## Deployment

### Frontend (Vercel)
```bash
npm run build
# Deploy dist/ folder to Vercel
```

### Backend (Railway/Render)
```bash
cd backend
npm run build
# Deploy with environment variables
```

## Security Features

- **Row Level Security**: Supabase RLS policies
- **Wallet Validation**: Address format validation
- **Error Handling**: Comprehensive error logging
- **Gas Optimization**: Smart gas price management

## Support
- ETH native transfers
- ERC-20 tokens (USDC, USDT, DAI)
- Daily, weekly, monthly frequencies
- Payment failure handling
- Real-time status updates
