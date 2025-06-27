import CoinbaseWalletSDK from '@coinbase/wallet-sdk'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

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
        toast.success('Wallet connected successfully!')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet'
      setWalletState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
      toast.error(errorMessage)
    }
  }

  const disconnectWallet = async () => {
    try {
      // Try to properly disconnect from the Coinbase Wallet SDK
      if (ethereum.disconnect) {
        await ethereum.disconnect()
      }
    } catch (error) {
      console.error('Error disconnecting from wallet:', error)
    }
    
    setWalletState({
      isConnected: false,
      address: null,
      isLoading: false,
      error: null
    })
    toast.success('Wallet disconnected')
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
