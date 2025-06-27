// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SubscriptionManager
 * @dev Manages USDC-based subscriptions for AutoPay Vault
 */
contract SubscriptionManager is Ownable, ReentrancyGuard {
    IERC20 public immutable usdcToken;
    
    // Subscription pricing (in USDC wei - 6 decimals)
    uint256 public pricePerMonth = 10 * 10**6; // $10 USDC per month
    
    // User subscriptions: address => expiry timestamp
    mapping(address => uint256) public expiryTimestamps;
    
    // Company treasury
    address public treasury;
    
    // Plan limits structure
    struct PlanLimits {
        uint256 maxSubscriptions;
        uint256 maxClients;
        bool hasAnalytics;
        bool hasApiAccess;
    }
    
    // Plan limits mapping: plan tier => limits
    mapping(uint256 => PlanLimits) public planLimits;
    
    // Events
    event Subscribed(address indexed user, uint256 expiry, uint256 months);
    event PriceUpdated(uint256 newPrice);
    event TreasuryUpdated(address newTreasury);
    event PlanLimitsUpdated(uint256 indexed planTier, uint256 maxSubscriptions, uint256 maxClients);
    
    constructor(
        address _usdcToken,
        address _treasury
    ) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC token address");
        require(_treasury != address(0), "Invalid treasury address");
        
        usdcToken = IERC20(_usdcToken);
        treasury = _treasury;
        
        // Initialize default plan limits
        planLimits[0] = PlanLimits(1, 5, false, false);      // Free: 1 sub, 5 clients
        planLimits[1] = PlanLimits(25, 100, true, true);     // Pro: 25 subs, 100 clients
        planLimits[2] = PlanLimits(type(uint256).max, type(uint256).max, true, true); // Enterprise: unlimited
    }
    
    /**
     * @dev Subscribe for specified number of months
     * @param months Number of months to subscribe for
     */
    function subscribe(uint256 months) external nonReentrant {
        require(months > 0 && months <= 24, "Invalid subscription duration");
        
        uint256 totalCost = pricePerMonth * months;
        require(usdcToken.balanceOf(msg.sender) >= totalCost, "Insufficient USDC balance");
        require(usdcToken.allowance(msg.sender, address(this)) >= totalCost, "Insufficient USDC allowance");
        
        // Transfer USDC from user to treasury
        require(usdcToken.transferFrom(msg.sender, treasury, totalCost), "USDC transfer failed");
        
        // Calculate new expiry date
        uint256 currentExpiry = expiryTimestamps[msg.sender];
        uint256 startTime = currentExpiry > block.timestamp ? currentExpiry : block.timestamp;
        uint256 newExpiry = startTime + (months * 30 days);
        
        expiryTimestamps[msg.sender] = newExpiry;
        
        emit Subscribed(msg.sender, newExpiry, months);
    }
    
    /**
     * @dev Check if user has an active subscription
     * @param user User address to check
     * @return bool True if subscription is active
     */
    function isActive(address user) external view returns (bool) {
        return expiryTimestamps[user] > block.timestamp;
    }
    
    /**
     * @dev Get user's subscription expiry timestamp
     * @param user User address to check
     * @return uint256 Expiry timestamp
     */
    function getExpiry(address user) external view returns (uint256) {
        return expiryTimestamps[user];
    }
    
    /**
     * @dev Get days remaining in subscription
     * @param user User address to check
     * @return uint256 Days remaining (0 if expired)
     */
    function getDaysRemaining(address user) external view returns (uint256) {
        uint256 expiry = expiryTimestamps[user];
        if (expiry <= block.timestamp) {
            return 0;
        }
        return (expiry - block.timestamp) / 1 days;
    }
    
    /**
     * @dev Admin function to set price per month
     * @param _pricePerMonth New price in USDC (6 decimals)
     */
    function setPricePerMonth(uint256 _pricePerMonth) external onlyOwner {
        require(_pricePerMonth > 0, "Price must be greater than 0");
        pricePerMonth = _pricePerMonth;
        emit PriceUpdated(_pricePerMonth);
    }
    
    /**
     * @dev Admin function to update treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }
    
    /**
     * @dev Admin function for emergency subscription extension
     * @param user User to extend subscription for
     * @param additionalDays Additional days to add
     */
    function extendSubscription(address user, uint256 additionalDays) external onlyOwner {
        uint256 currentExpiry = expiryTimestamps[user];
        uint256 startTime = currentExpiry > block.timestamp ? currentExpiry : block.timestamp;
        expiryTimestamps[user] = startTime + (additionalDays * 1 days);
    }
    
    /**
     * @dev Admin function to update plan limits
     * @param planTier Plan tier (0=Free, 1=Pro, 2=Enterprise)
     * @param maxSubscriptions Maximum subscriptions allowed
     * @param maxClients Maximum clients allowed
     * @param hasAnalytics Whether plan includes analytics
     * @param hasApiAccess Whether plan includes API access
     */
    function updatePlanLimits(
        uint256 planTier,
        uint256 maxSubscriptions,
        uint256 maxClients,
        bool hasAnalytics,
        bool hasApiAccess
    ) external onlyOwner {
        require(planTier <= 2, "Invalid plan tier");
        
        planLimits[planTier] = PlanLimits(
            maxSubscriptions,
            maxClients,
            hasAnalytics,
            hasApiAccess
        );
        
        emit PlanLimitsUpdated(planTier, maxSubscriptions, maxClients);
    }
    
    /**
     * @dev Get plan limits for a specific tier
     * @param planTier Plan tier to query
     * @return PlanLimits struct with limits and features
     */
    function getPlanLimits(uint256 planTier) external view returns (PlanLimits memory) {
        require(planTier <= 2, "Invalid plan tier");
        return planLimits[planTier];
    }
}
