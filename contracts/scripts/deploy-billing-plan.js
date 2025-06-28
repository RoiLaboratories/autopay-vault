const hre = require("hardhat");

async function main() {
  // Base mainnet USDC address
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

  console.log("Deploying BillingPlanManager contract...");
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("Network:", hre.network.name);

  // Deploy BillingPlanManager
  const BillingPlanManager = await hre.ethers.getContractFactory("BillingPlanManager");
  const billingPlanManager = await BillingPlanManager.deploy(USDC_ADDRESS);
  await billingPlanManager.waitForDeployment();
  const billingPlanManagerAddress = await billingPlanManager.getAddress();
  console.log("BillingPlanManager deployed to:", billingPlanManagerAddress);

  // Save deployment info
  const fs = require('fs');
  const path = require('path');
  
  // Read existing deployment info if it exists
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

  // Update with BillingPlanManager info
  deploymentInfo.billingPlanManager = {
    address: billingPlanManagerAddress,
    constructorArgs: [USDC_ADDRESS],
    deployedAt: new Date().toISOString()
  };
  
  // Preserve other deployment info
  if (!deploymentInfo.usdcAddress) {
    deploymentInfo.usdcAddress = USDC_ADDRESS;
  }
  if (!deploymentInfo.network) {
    deploymentInfo.network = hre.network.name;
  }

  // Ensure deployments directory exists
  const deploymentDir = path.dirname(deploymentPath);
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`\nDeployment info saved to deployments/${hre.network.name}.json`);

  // Verify contract on Basescan if not on local network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await billingPlanManager.deploymentTransaction().wait(5);

    console.log("\nVerifying BillingPlanManager contract...");
    
    try {
      await hre.run("verify:verify", {
        address: billingPlanManagerAddress,
        constructorArguments: [USDC_ADDRESS],
      });
      console.log("BillingPlanManager verified successfully!");
    } catch (error) {
      console.log("BillingPlanManager verification failed:", error.message);
    }
  }

  console.log("\n=== BillingPlanManager Deployment Summary ===");
  console.log("BillingPlanManager:", billingPlanManagerAddress);
  console.log("USDC Token:", USDC_ADDRESS);
  console.log("Network:", hre.network.name);
  
  console.log("\n=== Usage Instructions ===");
  console.log("To deploy to Base mainnet:");
  console.log("npx hardhat run scripts/deploy-billing-plan.js --network base");
  console.log("\nTo deploy to Base testnet:");
  console.log("npx hardhat run scripts/deploy-billing-plan.js --network base-sepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
