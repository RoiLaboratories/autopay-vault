# AutoPay Vault

AutoPay Vault is a modern, automated crypto subscription service that allows users to schedule recurring payments in cryptocurrency. Built with React, TypeScript, and powered by an autonomous payment agent.

## 🚀 Features

### Frontend
- **Modern UI**: Sleek, dark-themed interface built with React and TailwindCSS
- **Smooth Animations**: Powered by Framer Motion for fluid user interactions
- **Wallet Integration**: Seamless connection with Coinbase Wallet using CDP SDK
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Real-time Dashboard**: Monitor active subscriptions and payment history

### Backend Agent
- **Autonomous Payments**: Automatically processes scheduled payments
- **Multi-token Support**: ETH, USDC, USDT, and DAI
- **Robust Error Handling**: Comprehensive logging and failure recovery
- **Flexible Scheduling**: Monthly and yearly payment frequencies
- **Security First**: Enterprise-grade security with fail-safe mechanisms

## 🛠️ Tech Stack

### Frontend
- **React 19** + **TypeScript**
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **ShadCN/UI** components
- **Coinbase Wallet SDK** for blockchain integration
- **Supabase** for database

### Backend
- **Node.js** + **TypeScript**
- **Ethers.js** for blockchain interactions
- **Supabase** for data persistence
- **Winston** for logging
- **Node-cron** for scheduling

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Ethereum wallet with some ETH for gas fees

### Frontend Setup

1. **Install dependencies** (already completed):
```bash
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Start development server:**
```bash
npm run dev
```

### Backend Setup

1. **Install backend dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
ETHEREUM_RPC_URL=your_ethereum_rpc_url
PRIVATE_KEY=your_private_key
```

3. **Start the agent:**
```bash
npm run dev
```

## 🗄️ Database Setup

### Supabase Tables

Create these tables in your Supabase project:

#### subscriptions
```sql
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  token_amount DECIMAL NOT NULL,
  token_symbol TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  next_payment_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_payment_date TIMESTAMPTZ
);
```

#### payment_logs
```sql
CREATE TABLE payment_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES subscriptions(id),
  transaction_hash TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  amount DECIMAL NOT NULL,
  token_symbol TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 Usage

1. **Connect Wallet**: Connect your Coinbase Wallet
2. **Create Billing Plans**: Set recipient, amount and frequency
3. **Monitor Dashboard**: Track active subscriptions and payment history  
4. **Manage Subscriptions**: Pause, resume, or cancel subscriptions

## 🔐 Security

- **Private Key Security**: Never commit private keys to version control
- **RLS**: Database access is protected by Row Level Security
- **Gas Optimization**: Smart gas price management
- **Error Handling**: Comprehensive error logging and recovery
- **Balance Monitoring**: Automatic balance checks before payments

## 🎯 Next Steps

1. **Set up Supabase**: Create account and database tables
2. **Configure environment variables**: Add your credentials
3. **Install backend dependencies**: Run `npm install` in backend folder
4. **Deploy**: Host frontend on Vercel, backend on Railway/Heroku

---

**Built with ❤️ for autonomous crypto payments**
