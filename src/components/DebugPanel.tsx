import React from 'react'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useWallet } from '@/hooks/useWallet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ethers } from 'ethers'

export const DebugPanel: React.FC = () => {
  const { 
    currentPlan, 
    isActive, 
    daysRemaining, 
    expiryDate, 
    isLoading,
    refreshSubscription,
    testContractConnectivity
  } = useSubscription()
  
  const { ethereum } = useWallet()

  const handleTestConnectivity = async () => {
    console.log('Testing contract connectivity...')
    const result = await testContractConnectivity()
    console.log('Connectivity test result:', result)
    alert(`Contract connectivity test ${result ? 'passed' : 'failed'}. Check console for details.`)
  }

  const handleRefreshSubscription = async () => {
    console.log('Refreshing subscription...')
    await refreshSubscription()
    console.log('Subscription refresh completed')
  }

  const handleSimpleCheck = async () => {
    console.log('Running simple subscription check...')
    // Use a more basic check that's less likely to fail
    try {
      alert(`Current subscription status: ${isActive ? 'Active' : 'Inactive'} (Plan: ${currentPlan})`)
    } catch (error) {
      console.error('Simple check failed:', error)
      alert('Simple check failed - see console for details')
    }
  }

  const handleTestUSDC = async () => {
    console.log('Testing USDC contract connectivity...')
    try {
      // Test USDC contract connectivity
      const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
      const usdcContract = new ethers.Contract(
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
        ['function balanceOf(address) view returns (uint256)', 'function totalSupply() view returns (uint256)'],
        provider
      )
      
      // Test a known address (Base bridge or similar)
      const testAddress = '0x0000000000000000000000000000000000000001'
      const balance = await usdcContract.balanceOf(testAddress)
      const totalSupply = await usdcContract.totalSupply()
      
      console.log('USDC Test Results:')
      console.log('Test balance:', balance.toString())
      console.log('Total supply:', totalSupply.toString())
      
      alert(`USDC Contract Test Passed!\nTotal Supply: ${ethers.formatUnits(totalSupply, 6)} USDC\nContract is responding correctly.`)
      return true
    } catch (error: any) {
      console.error('USDC test failed:', error)
      alert(`USDC Contract Test Failed: ${error.message}`)
      return false
    }
  }

  const handleTestWallet = async () => {
    console.log('Testing wallet connectivity and network...')
    try {
      if (!ethereum) {
        alert('No wallet detected')
        return false
      }

      const provider = new ethers.BrowserProvider(ethereum)
      const network = await provider.getNetwork()
      const signer = await provider.getSigner()
      const signerAddress = await signer.getAddress()
      
      console.log('Wallet test results:')
      console.log('Network:', network.chainId, network.name)
      console.log('Address:', signerAddress)
      
      // Test USDC contract through wallet
      const usdcContract = new ethers.Contract(
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        ['function balanceOf(address) view returns (uint256)'],
        signer
      )
      
      const balance = await usdcContract.balanceOf(signerAddress)
      console.log('USDC balance via wallet:', balance.toString())
      
      alert(`Wallet Test Results:
Network: ${network.name} (Chain ID: ${network.chainId})
Address: ${signerAddress}
USDC Balance: ${ethers.formatUnits(balance, 6)} USDC
${network.chainId === 8453n ? '✅ Correct network (Base)' : '❌ Wrong network - switch to Base'}`)
      
      return network.chainId === 8453n
    } catch (error: any) {
      console.error('Wallet test failed:', error)
      alert(`Wallet Test Failed: ${error.message}`)
      return false
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Debug Panel</CardTitle>
        <CardDescription>Debug tools for subscription and contract connectivity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Current Plan:</strong> {currentPlan}
          </div>
          <div>
            <strong>Is Active:</strong> {isActive ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Days Remaining:</strong> {daysRemaining}
          </div>
          <div>
            <strong>Expiry Date:</strong> {expiryDate ? expiryDate.toLocaleDateString() : 'None'}
          </div>
          <div>
            <strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={handleTestConnectivity}
            variant="outline"
            size="sm"
          >
            Test Contract
          </Button>
          <Button 
            onClick={handleSimpleCheck}
            variant="outline"
            size="sm"
          >
            Simple Check
          </Button>
          <Button 
            onClick={handleRefreshSubscription}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Full Refresh'}
          </Button>
          <Button 
            onClick={handleTestUSDC}
            variant="outline"
            size="sm"
          >
            Test USDC
          </Button>
          <Button 
            onClick={handleTestWallet}
            variant="outline"
            size="sm"
          >
            Test Wallet
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 mt-4">
          <p>Open browser console to see detailed logs.</p>
          <p>Contract Address: {import.meta.env.VITE_SUBSCRIPTION_CONTRACT_ADDRESS}</p>
          <p><strong>Note:</strong> Automatic subscription refresh is disabled. Use buttons above to test manually.</p>
        </div>
      </CardContent>
    </Card>
  )
}
