// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Minimal Vault implementation for ArcVault PoC
contract ArcVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public immutable arcHook;

    uint256 public totalAssets;
    uint256 public totalShares;

    mapping(address => uint256) public balanceOf;

    event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);

    constructor(address _usdc, address _arcHook) {
        usdc = IERC20(_usdc);
        arcHook = _arcHook;
    }

    function deposit(uint256 assets, address receiver) external nonReentrant returns (uint256 shares) {
        require(assets > 0, "Zero assets");

        shares = totalShares == 0 ? assets : (assets * totalShares) / totalAssets;

        balanceOf[receiver] += shares;
        totalShares += shares;
        totalAssets += assets;

        usdc.safeTransferFrom(msg.sender, address(this), assets);

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    function withdraw(uint256 shares, address receiver, address owner) external nonReentrant returns (uint256 assets) {
        require(shares > 0, "Zero shares");
        require(balanceOf[owner] >= shares, "Insufficient shares");
        require(msg.sender == owner, "Only owner can withdraw");

        assets = (shares * totalAssets) / totalShares;

        balanceOf[owner] -= shares;
        totalShares -= shares;
        totalAssets -= assets;

        usdc.safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    function previewDeposit(uint256 assets) public view returns (uint256) {
        return totalShares == 0 ? assets : (assets * totalShares) / totalAssets;
    }

    function previewWithdraw(uint256 shares) public view returns (uint256) {
        return totalShares == 0 ? 0 : (shares * totalAssets) / totalShares;
    }
}
