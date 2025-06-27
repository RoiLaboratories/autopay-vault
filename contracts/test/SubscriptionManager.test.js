const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SubscriptionManager", function () {
  let subscriptionManager;
  let mockUSDC;
  let owner;
  let treasury;
  let user;

  beforeEach(async function () {
    [owner, treasury, user] = await ethers.getSigners();

    // Deploy mock USDC token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("Mock USDC", "USDC", 6); // 6 decimals like real USDC
    await mockUSDC.waitForDeployment();

    // Deploy SubscriptionManager
    const SubscriptionManager = await ethers.getContractFactory("SubscriptionManager");
    subscriptionManager = await SubscriptionManager.deploy(
      await mockUSDC.getAddress(),
      treasury.address
    );
    await subscriptionManager.waitForDeployment();

    // Mint some USDC to user
    await mockUSDC.mint(user.address, ethers.parseUnits("1000", 6)); // 1000 USDC
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await subscriptionManager.owner()).to.equal(owner.address);
    });

    it("Should set the right USDC token", async function () {
      expect(await subscriptionManager.usdcToken()).to.equal(await mockUSDC.getAddress());
    });

    it("Should set the right treasury", async function () {
      expect(await subscriptionManager.treasury()).to.equal(treasury.address);
    });

    it("Should set default price per month", async function () {
      expect(await subscriptionManager.pricePerMonth()).to.equal(ethers.parseUnits("10", 6)); // $10
    });
  });

  describe("Subscription", function () {
    it("Should allow user to subscribe for 1 month", async function () {
      const months = 1;
      const cost = await subscriptionManager.pricePerMonth();

      // Approve USDC spending
      await mockUSDC.connect(user).approve(await subscriptionManager.getAddress(), cost);

      // Subscribe and just check that event is emitted with correct user and months
      await expect(subscriptionManager.connect(user).subscribe(months))
        .to.emit(subscriptionManager, "Subscribed")
        .withArgs(user.address, anyValue, months); // Use anyValue for timestamp since it can vary by 1 second

      // Check if subscription is active
      expect(await subscriptionManager.isActive(user.address)).to.be.true;

      // Check days remaining
      const daysRemaining = await subscriptionManager.getDaysRemaining(user.address);
      expect(daysRemaining).to.be.greaterThan(29); // Should be around 30 days
    });

    it("Should require sufficient USDC balance", async function () {
      // Give user only 50 USDC (not enough for 12 months which costs 120 USDC)
      await mockUSDC.mint(user.address, ethers.parseUnits("50", 6));
      
      const months = 12;
      const cost = (await subscriptionManager.pricePerMonth()) * BigInt(months);

      // Approve spending but user doesn't have enough balance
      await mockUSDC.connect(user).approve(await subscriptionManager.getAddress(), cost);
      
      // This should fail due to insufficient balance
      await expect(subscriptionManager.connect(user).subscribe(months))
        .to.be.revertedWith("Insufficient USDC balance");
    });

    it("Should require USDC approval", async function () {
      const months = 1;

      // Don't approve USDC spending
      await expect(subscriptionManager.connect(user).subscribe(months))
        .to.be.revertedWith("Insufficient USDC allowance");
    });

    it("Should extend existing subscription", async function () {
      const months = 1;
      const cost = await subscriptionManager.pricePerMonth();

      // First subscription
      await mockUSDC.connect(user).approve(await subscriptionManager.getAddress(), cost * BigInt(2));
      await subscriptionManager.connect(user).subscribe(months);
      
      const firstExpiry = await subscriptionManager.getExpiry(user.address);

      // Second subscription should extend, not replace
      await subscriptionManager.connect(user).subscribe(months);
      const secondExpiry = await subscriptionManager.getExpiry(user.address);

      expect(secondExpiry).to.be.greaterThan(firstExpiry);
    });
  });

  describe("Admin functions", function () {
    it("Should allow owner to set price", async function () {
      const newPrice = ethers.parseUnits("15", 6); // $15
      
      await expect(subscriptionManager.setPricePerMonth(newPrice))
        .to.emit(subscriptionManager, "PriceUpdated")
        .withArgs(newPrice);

      expect(await subscriptionManager.pricePerMonth()).to.equal(newPrice);
    });

    it("Should not allow non-owner to set price", async function () {
      const newPrice = ethers.parseUnits("15", 6);
      
      await expect(subscriptionManager.connect(user).setPricePerMonth(newPrice))
        .to.be.revertedWithCustomError(subscriptionManager, "OwnableUnauthorizedAccount")
        .withArgs(user.address);
    });

    it("Should allow owner to extend subscription", async function () {
      const additionalDays = 7;
      
      await subscriptionManager.extendSubscription(user.address, additionalDays);
      
      const daysRemaining = await subscriptionManager.getDaysRemaining(user.address);
      expect(daysRemaining).to.equal(additionalDays);
    });
  });
});

// Helper function for testing events with dynamic values
const anyValue = { asymmetricMatch: () => true };
