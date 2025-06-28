// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BillingPlanManager
 * @dev Smart contract for managing billing plans and subscriptions
 */
contract BillingPlanManager is ReentrancyGuard, Ownable {
    IERC20 public immutable usdcToken;
    
    struct BillingPlan {
        string planId;
        address creator;
        string name;
        uint256 amount;
        uint256 interval; // in seconds (monthly = 2592000, yearly = 31536000)
        address recipientWallet;
        bool isActive;
        uint256 createdAt;
    }
    
    struct Subscription {
        string planId;
        address subscriber;
        uint256 nextPaymentDue;
        bool isActive;
        uint256 createdAt;
        uint256 lastPayment;
    }
    
    mapping(string => BillingPlan) public billingPlans;
    mapping(address => string[]) public userPlans;
    mapping(string => Subscription[]) public planSubscriptions;
    mapping(address => mapping(string => bool)) public userSubscriptions;
    
    // Events
    event PlanCreated(string indexed planId, address indexed creator, string name, uint256 amount);
    event PlanUpdated(string indexed planId, string name, uint256 amount);
    event PlanDeactivated(string indexed planId);
    event SubscriptionCreated(string indexed planId, address indexed subscriber, uint256 nextPaymentDue);
    event PaymentProcessed(string indexed planId, address indexed subscriber, uint256 amount);
    event SubscriptionCanceled(string indexed planId, address indexed subscriber);
    
    constructor(address _usdcToken) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
    }
    
    /**
     * @dev Create a new billing plan
     */
    function createPlan(
        string memory _planId,
        string memory _name,
        uint256 _amount,
        uint256 _interval,
        address _recipientWallet
    ) external {
        require(bytes(_planId).length > 0, "Plan ID cannot be empty");
        require(bytes(_name).length > 0, "Plan name cannot be empty");
        require(_amount > 0, "Amount must be greater than 0");
        require(_interval > 0, "Interval must be greater than 0");
        require(_recipientWallet != address(0), "Invalid recipient wallet");
        require(bytes(billingPlans[_planId].planId).length == 0, "Plan ID already exists");
        
        billingPlans[_planId] = BillingPlan({
            planId: _planId,
            creator: msg.sender,
            name: _name,
            amount: _amount,
            interval: _interval,
            recipientWallet: _recipientWallet,
            isActive: true,
            createdAt: block.timestamp
        });
        
        userPlans[msg.sender].push(_planId);
        
        emit PlanCreated(_planId, msg.sender, _name, _amount);
    }
    
    /**
     * @dev Update an existing billing plan
     */
    function updatePlan(
        string memory _planId,
        string memory _name,
        uint256 _amount,
        address _recipientWallet
    ) external {
        BillingPlan storage plan = billingPlans[_planId];
        require(plan.creator == msg.sender, "Only plan creator can update");
        require(plan.isActive, "Plan is not active");
        
        plan.name = _name;
        plan.amount = _amount;
        plan.recipientWallet = _recipientWallet;
        
        emit PlanUpdated(_planId, _name, _amount);
    }
    
    /**
     * @dev Deactivate a billing plan
     */
    function deactivatePlan(string memory _planId) external {
        BillingPlan storage plan = billingPlans[_planId];
        require(plan.creator == msg.sender, "Only plan creator can deactivate");
        require(plan.isActive, "Plan is already inactive");
        
        plan.isActive = false;
        
        emit PlanDeactivated(_planId);
    }
    
    /**
     * @dev Subscribe to a billing plan
     */
    function subscribe(string memory _planId) external nonReentrant {
        BillingPlan memory plan = billingPlans[_planId];
        require(plan.isActive, "Plan is not active");
        require(!userSubscriptions[msg.sender][_planId], "Already subscribed to this plan");
        
        // Calculate next payment due
        uint256 nextPaymentDue = block.timestamp + plan.interval;
        
        // Process initial payment
        require(
            usdcToken.transferFrom(msg.sender, plan.recipientWallet, plan.amount),
            "Payment failed"
        );
        
        // Create subscription
        Subscription memory newSubscription = Subscription({
            planId: _planId,
            subscriber: msg.sender,
            nextPaymentDue: nextPaymentDue,
            isActive: true,
            createdAt: block.timestamp,
            lastPayment: block.timestamp
        });
        
        planSubscriptions[_planId].push(newSubscription);
        userSubscriptions[msg.sender][_planId] = true;
        
        emit SubscriptionCreated(_planId, msg.sender, nextPaymentDue);
        emit PaymentProcessed(_planId, msg.sender, plan.amount);
    }
    
    /**
     * @dev Process a recurring payment for a subscription
     */
    function processPayment(string memory _planId, address _subscriber) external nonReentrant {
        BillingPlan memory plan = billingPlans[_planId];
        require(plan.isActive, "Plan is not active");
        require(userSubscriptions[_subscriber][_planId], "No active subscription found");
        
        // Find the subscription
        Subscription[] storage subscriptions = planSubscriptions[_planId];
        bool found = false;
        
        for (uint256 i = 0; i < subscriptions.length; i++) {
            if (subscriptions[i].subscriber == _subscriber && subscriptions[i].isActive) {
                require(block.timestamp >= subscriptions[i].nextPaymentDue, "Payment not due yet");
                
                // Process payment
                require(
                    usdcToken.transferFrom(_subscriber, plan.recipientWallet, plan.amount),
                    "Payment failed"
                );
                
                // Update subscription
                subscriptions[i].nextPaymentDue = block.timestamp + plan.interval;
                subscriptions[i].lastPayment = block.timestamp;
                
                emit PaymentProcessed(_planId, _subscriber, plan.amount);
                found = true;
                break;
            }
        }
        
        require(found, "Active subscription not found");
    }
    
    /**
     * @dev Cancel a subscription
     */
    function cancelSubscription(string memory _planId) external {
        require(userSubscriptions[msg.sender][_planId], "No active subscription found");
        
        // Find and deactivate the subscription
        Subscription[] storage subscriptions = planSubscriptions[_planId];
        
        for (uint256 i = 0; i < subscriptions.length; i++) {
            if (subscriptions[i].subscriber == msg.sender && subscriptions[i].isActive) {
                subscriptions[i].isActive = false;
                userSubscriptions[msg.sender][_planId] = false;
                
                emit SubscriptionCanceled(_planId, msg.sender);
                break;
            }
        }
    }
    
    /**
     * @dev Get billing plan details
     */
    function getPlan(string memory _planId) external view returns (BillingPlan memory) {
        return billingPlans[_planId];
    }
    
    /**
     * @dev Get user's billing plans
     */
    function getUserPlans(address _user) external view returns (string[] memory) {
        return userPlans[_user];
    }
    
    /**
     * @dev Get subscriptions for a plan
     */
    function getPlanSubscriptions(string memory _planId) external view returns (Subscription[] memory) {
        return planSubscriptions[_planId];
    }
    
    /**
     * @dev Check if user has active subscription to a plan
     */
    function hasActiveSubscription(address _user, string memory _planId) external view returns (bool) {
        return userSubscriptions[_user][_planId];
    }
    
    /**
     * @dev Get subscription details for a user and plan
     */
    function getSubscription(address _user, string memory _planId) external view returns (Subscription memory) {
        require(userSubscriptions[_user][_planId], "No subscription found");
        
        Subscription[] memory subscriptions = planSubscriptions[_planId];
        
        for (uint256 i = 0; i < subscriptions.length; i++) {
            if (subscriptions[i].subscriber == _user && subscriptions[i].isActive) {
                return subscriptions[i];
            }
        }
        
        revert("Active subscription not found");
    }
}
