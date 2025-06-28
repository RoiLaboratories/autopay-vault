const hre = require("hardhat");

async function main() {
  // Base mainnet USDC address
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  
  // Treasury address (replace with your treasury wallet)
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || ""; // Ensure this is set in your environment variables

  console.log("Deploying contracts...");
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("Treasury Address:", TREASURY_ADDRESS);

  // Deploy SubscriptionManager
  console.log("\n1. Deploying SubscriptionManager contract...");
  const SubscriptionManager = await hre.ethers.getContractFactory("SubscriptionManager");
  const subscriptionManager = await SubscriptionManager.deploy(USDC_ADDRESS, TREASURY_ADDRESS);
  await subscriptionManager.waitForDeployment();
  const subscriptionManagerAddress = await subscriptionManager.getAddress();
  console.log("SubscriptionManager deployed to:", subscriptionManagerAddress);



  // Save deployment info
  const fs = require('fs');
  const path = require('path');
  
  // Check if deployment file exists and load existing data
  const deploymentPath = `../deployments/${hre.network.name}.json`;
  let deploymentInfo = {};
  
  if (fs.existsSync(deploymentPath)) {
    try {
      const existingData = fs.readFileSync(deploymentPath, 'utf8');
      deploymentInfo = JSON.parse(existingData);
      console.log("Found existing deployment info, updating...");
    } catch (error) {
      console.log("Could not read existing deployment info, creating new...");
    }
  }

  // Update with SubscriptionManager info
  deploymentInfo = {
    ...deploymentInfo,
    subscriptionManager: {
      address: subscriptionManagerAddress,
      constructorArgs: [USDC_ADDRESS, TREASURY_ADDRESS],
      deployedAt: new Date().toISOString()
    },
    usdcAddress: USDC_ADDRESS,
    treasuryAddress: TREASURY_ADDRESS,
    network: hre.network.name,
    lastUpdated: new Date().toISOString()
  };

  // Ensure deployments directory exists
  const deploymentsDir = '../deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`\nDeployment info saved to deployments/${hre.network.name}.json`);

  // Verify contracts on Basescan if not on local network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await subscriptionManager.deploymentTransaction().wait(5);

    console.log("\nVerifying SubscriptionManager contract...");
    
    try {
      await hre.run("verify:verify", {
        address: subscriptionManagerAddress,
        constructorArguments: [USDC_ADDRESS, TREASURY_ADDRESS],
      });
      console.log("SubscriptionManager verified successfully!");
    } catch (error) {
      console.log("SubscriptionManager verification failed:", error.message);
    }
  }

  console.log("\n=== SubscriptionManager Deployment Summary ===");
  console.log("SubscriptionManager:", subscriptionManagerAddress);
  console.log("USDC Token:", USDC_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);
  console.log("Network:", hre.network.name);
  
  console.log("\n=== Usage Instructions ===");
  console.log("To deploy BillingPlanManager separately:");
  console.log("npx hardhat run scripts/deploy-billing-plan.js --network", hre.network.name);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
