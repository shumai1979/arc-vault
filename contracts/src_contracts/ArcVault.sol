// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAgentRegistry {
    function isAgentValid(address agentWallet) external view returns (bool);
}

/// @title  ArcVault
/// @notice Accepts Arc Testnet native USDC (msg.value) and tracks share balances.
///         On Arc Testnet, USDC is the native gas token. Includes AI Agent delegation.
contract ArcVault is ReentrancyGuard {

    uint256 public totalAssets;
    uint256 public totalShares;

    mapping(address => uint256) public sharesOf;
    
    // ERC-8004 AI Agent Delegation
    mapping(address => address) public delegatedAgent;
    IAgentRegistry public agentRegistry;

    event Deposit(address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed owner, address indexed receiver, uint256 assets, uint256 shares);
    event AgentDelegated(address indexed user, address indexed agent);

    constructor(address _registry) {
        agentRegistry = IAgentRegistry(_registry);
    }

    // "?"?"? Deposit: send native USDC "?"?"?
    function deposit(address receiver) external payable nonReentrant returns (uint256 shares) {
        require(msg.value > 0, "ArcVault: zero deposit");

        shares = (totalShares == 0 || totalAssets == 0)
            ? msg.value
            : (msg.value * totalShares) / totalAssets;

        sharesOf[receiver] += shares;
        totalShares        += shares;
        totalAssets        += msg.value;

        emit Deposit(receiver, msg.value, shares);
    }

    // "?"?"? Withdraw: redeem shares for native USDC "?"?"?
    function withdraw(uint256 shares, address payable receiver) external nonReentrant returns (uint256 assets) {
        require(shares > 0,                       "ArcVault: zero shares");
        require(sharesOf[msg.sender] >= shares,   "ArcVault: insufficient shares");

        assets = (shares * totalAssets) / totalShares;

        sharesOf[msg.sender] -= shares;
        totalShares          -= shares;
        totalAssets          -= assets;

        (bool ok,) = receiver.call{value: assets}("");
        require(ok, "ArcVault: transfer failed");

        emit Withdraw(msg.sender, receiver, assets, shares);
    }
    
    // "?"?"? AI Agent Delegation "?"?"?
    function delegateToAgent(address agentWallet) external {
        if (agentWallet != address(0)) {
            require(agentRegistry.isAgentValid(agentWallet), "ArcVault: Agent not registered or low rep");
        }
        delegatedAgent[msg.sender] = agentWallet;
        emit AgentDelegated(msg.sender, agentWallet);
    }

    // "?"?"? Views "?"?"?
    function previewDeposit(uint256 assets) external view returns (uint256) {
        return (totalShares == 0 || totalAssets == 0) ? assets : (assets * totalShares) / totalAssets;
    }

    function previewWithdraw(uint256 shares) external view returns (uint256) {
        return (totalShares == 0) ? 0 : (shares * totalAssets) / totalShares;
    }

    function balanceOf(address account) external view returns (uint256) {
        return sharesOf[account];
    }
}
