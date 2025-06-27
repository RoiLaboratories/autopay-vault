import CoinbaseWalletSDK from '@coinbase/wallet-sdk'
import { useState, useEffect } from 'react'

const APP_NAME = 'AutoPay Vault'
const APP_LOGO_URL = 'https://via.placeholder.com/64x64.png?text=APV'

const coinbaseWallet = new CoinbaseWalletSDK({
  appName: APP_NAME,
  appLogoUrl: APP_LOGO_URL
})

const ethereum = coinbaseWallet.makeWeb3Provider()

export interface WalletState {
  isConnected: boolean
  address: string | null
  isLoading: boolean
  error: string | null
}

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    isLoading: false,
    error: null
  })

  const connectWallet = async () => {
    try {
      setWalletState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      }) as string[]
      
      if (accounts && accounts.length > 0) {
        setWalletState({
          isConnected: true,
          address: accounts[0],
          isLoading: false,
          error: null
        })
      }
    } catch (error) {
      setWalletState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet'
      }))
    }
  }

  const disconnectWallet = () => {
    setWalletState({
      isConnected: false,
      address: null,
      isLoading: false,
      error: null
    })
  }

  const checkConnection = async () => {
    try {
      const accounts = await ethereum.request({ method: 'eth_accounts' }) as string[]
      if (accounts && accounts.length > 0) {
        setWalletState(prev => ({
          ...prev,
          isConnected: true,
          address: accounts[0]
        }))
      }
    } catch (error) {
      console.error('Failed to check wallet connection:', error)
    }
  }

  useEffect(() => {
    checkConnection()

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet()
      } else {
        setWalletState(prev => ({
          ...prev,
          address: accounts[0],
          isConnected: true
        }))
      }
    }

    ethereum.on('accountsChanged', handleAccountsChanged)

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged)
    }
  }, [])

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    ethereum
  }
}
