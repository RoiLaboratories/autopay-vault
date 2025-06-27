import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'
import { handleCors } from './cors'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Token addresses on Base network
const TOKEN_ADDRESSES: { [key: string]: string } = {
  'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'ETH': '0x0000000000000000000000000000000000000000',
  'cbBTC': '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
  'DAI': '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
}

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)'
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { subscriptionId } = req.body

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID required' })
    }

    // Get subscription details
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('status', 'active')
      .single()

    if (fetchError || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' })
    }

    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL!)
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider)

    let transactionHash: string

    if (subscription.token_symbol === 'ETH') {
      // Send ETH
      const amount = ethers.parseEther(subscription.token_amount.toString())
      const tx = await wallet.sendTransaction({
        to: subscription.recipient_address,
        value: amount
      })
      await tx.wait()
      transactionHash = tx.hash
    } else {
      // Send ERC-20 token
      const tokenAddress = TOKEN_ADDRESSES[subscription.token_symbol]
      if (!tokenAddress) {
        throw new Error(`Unsupported token: ${subscription.token_symbol}`)
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet)
      const decimals = await tokenContract.decimals()
      const amount = ethers.parseUnits(subscription.token_amount.toString(), decimals)
      
      const tx = await tokenContract.transfer(subscription.recipient_address, amount)
      await tx.wait()
      transactionHash = tx.hash
    }

    // Log payment
    await supabase.from('payment_logs').insert({
      subscription_id: subscriptionId,
      transaction_hash: transactionHash,
      status: 'success',
      amount: subscription.token_amount,
      token_symbol: subscription.token_symbol
    })

    // Update next payment date
    const nextPaymentDate = new Date()
    switch (subscription.frequency) {
      case 'daily':
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 1)
        break
      case 'weekly':
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 7)
        break
      case 'monthly':
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1)
        break
    }

    await supabase
      .from('subscriptions')
      .update({ 
        next_payment_date: nextPaymentDate.toISOString(),
        last_payment_date: new Date().toISOString()
      })
      .eq('id', subscriptionId)

    res.status(200).json({
      success: true,
      transactionHash,
      nextPaymentDate: nextPaymentDate.toISOString()
    })

  } catch (error) {
    console.error('Payment execution error:', error)
    
    // Log failed payment
    if (req.body.subscriptionId) {
      await supabase.from('payment_logs').insert({
        subscription_id: req.body.subscriptionId,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    res.status(500).json({ 
      error: 'Payment failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
