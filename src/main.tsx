import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PrivyProvider } from '@privy-io/react-auth'
import { Buffer } from 'buffer'

// Polyfill Buffer for wallet libraries
window.Buffer = Buffer;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#4ade80', // Tailwind emerald-400
          logo: '/AutopayVault logo.png',
          // borderRadius is not supported by Privy, so omit it
        },
        embeddedWallets: { createOnLogin: 'users-without-wallets' }
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)
