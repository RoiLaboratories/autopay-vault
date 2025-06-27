const hre = require("hardhat");

async function main() {
  // Base mainnet USDC address
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  
  // Treasury address (replace with your treasury wallet)
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || ""; // Ensure this is set in your environment variables

  console.log("Deploying SubscriptionManager contract...");
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("Treasury Address:", TREASURY_ADDRESS);

  const SubscriptionManager = await hre.ethers.getContractFactory("SubscriptionManager");
  const subscriptionManager = await SubscriptionManager.deploy(USDC_ADDRESS, TREASURY_ADDRESS);

  await subscriptionManager.waitForDeployment();

  const contractAddress = await subscriptionManager.getAddress();
  console.log("SubscriptionManager deployed to:", contractAddress);

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    contractAddress,
    usdcAddress: USDC_ADDRESS,
    treasuryAddress: TREASURY_ADDRESS,
    network: hre.network.name,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    `../deployments/${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`Deployment info saved to deployments/${hre.network.name}.json`);

  // Verify contract on Basescan if not on local network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await subscriptionManager.deploymentTransaction().wait(5);

    console.log("Verifying contract...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [USDC_ADDRESS, TREASURY_ADDRESS],
      });
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
