const { ethers } = require('ethers');

// Base network configuration
const baseRpcUrl = 'https://mainnet.base.org';
const provider = new ethers.JsonRpcProvider(baseRpcUrl);

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BILLING_PLAN_MANAGER_ADDRESS = '0xe6619e23b406BB7267bf56576018863E8b7BF4D0';

// Replace with your actual wallet address - check your wallet
const walletAddressRaw = '0x842E6DF3bc92C7fbB60cD44DB5D91C41e1fcC3f5';
// Convert to lowercase first, then use getAddress for proper checksum
const walletAddress = ethers.getAddress(walletAddressRaw.toLowerCase());

const USDC_ABI = [
  'function decimals() external view returns (uint8)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)'
];

const BILLING_PLAN_MANAGER_ABI = [
  'function getPlan(string _planId) external view returns (tuple(string planId, address creator, string name, uint256 amount, uint256 interval, address recipientWallet, bool isActive, uint256 createdAt))'
];

async function debugState() {
  try {
    console.log('=== USDC Contract Info ===');
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    
    const [name, symbol, decimals] = await Promise.all([
      usdc.name(),
      usdc.symbol(),
      usdc.decimals()
    ]);
    
    console.log('Name:', name);
    console.log('Symbol:', symbol);
    console.log('Decimals:', decimals);
    
    console.log('\n=== Wallet State ===');
    console.log('Wallet Address:', walletAddress);
    
    const [balance, allowance] = await Promise.all([
      usdc.balanceOf(walletAddress),
      usdc.allowance(walletAddress, BILLING_PLAN_MANAGER_ADDRESS)
    ]);
    
    console.log('Balance (raw):', balance.toString());
    console.log('Balance (formatted):', ethers.formatUnits(balance, decimals), 'USDC');
    console.log('Allowance (raw):', allowance.toString());
    console.log('Allowance (formatted):', ethers.formatUnits(allowance, decimals), 'USDC');
    
    // Check a sample plan
    console.log('\n=== Sample Plan Check ===');
    const billingManager = new ethers.Contract(BILLING_PLAN_MANAGER_ADDRESS, BILLING_PLAN_MANAGER_ABI, provider);
    
    // You'll need to replace this with an actual plan ID from your system
    const samplePlanId = 'plan_1752905142075'; // Use actual plan ID from API
    
    try {
      const plan = await billingManager.getPlan(samplePlanId);
      console.log('Plan found:');
      console.log('- Plan ID:', plan.planId);
      console.log('- Creator:', plan.creator);
      console.log('- Name:', plan.name);
      console.log('- Amount (raw):', plan.amount.toString());
      console.log('- Amount (formatted):', ethers.formatUnits(plan.amount, decimals), 'USDC');
      console.log('- Interval:', plan.interval.toString(), 'seconds');
      console.log('- Recipient:', plan.recipientWallet);
      console.log('- Is Active:', plan.isActive);
      
      // Check if we have enough allowance for this plan
      const requiredAmount = plan.amount;
      console.log('\n=== Comparison ===');
      console.log('Required amount:', requiredAmount.toString());
      console.log('Current allowance:', allowance.toString());
      console.log('Allowance sufficient?', allowance >= requiredAmount);
      console.log('Balance sufficient?', balance >= requiredAmount);
      
    } catch (planError) {
      console.log('Could not fetch sample plan (expected if plan doesn\'t exist):', planError.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugState();
