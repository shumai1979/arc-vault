// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";

interface IAgentRegistry {
    function isAgentValid(address agentWallet) external view returns (bool);
    function updateReputation(address agentWallet, int256 delta) external;
}

contract ArcVaultHook is BaseHook {
    using PoolIdLibrary for PoolKey;

    mapping(address => bool) public isVIP;
    IAgentRegistry public agentRegistry;
    uint256 public lastRebalanceTime;
    uint24 public baseFee = 3000;
    mapping(PoolId => uint256) public volatilityIndex;

    error NotVIP();
    error InvalidAgent();

    event AIRebalanced(address indexed agent, uint256 timestamp, int256 amount);

    constructor(IPoolManager _poolManager, address _registry) BaseHook(_poolManager) {
        agentRegistry = IAgentRegistry(_registry);
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: true,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function _beforeAddLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) internal override returns (bytes4) {
        if (!isVIP[sender]) revert NotVIP();
        return BaseHook.beforeAddLiquidity.selector;
    }

    function _beforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = key.toId();
        uint256 vol = volatilityIndex[poolId];
        uint24 dynamicFee = baseFee + uint24(vol * 10);
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    // Called by the Autonomous AI Agent
    function executeAIRebalance(PoolKey calldata key, int256 amountToRebalance, bool simulatedSuccess) external {
        if (!agentRegistry.isAgentValid(msg.sender)) revert InvalidAgent();
        
        lastRebalanceTime = block.timestamp;
        
        // Reward or penalize the agent based on performance (mock simulation)
        if (simulatedSuccess) {
            agentRegistry.updateReputation(msg.sender, 5); // +5 rep
        } else {
            agentRegistry.updateReputation(msg.sender, -10); // -10 rep
        }
        
        emit AIRebalanced(msg.sender, block.timestamp, amountToRebalance);
    }

    function setVIPStatus(address user, bool status) external {
        isVIP[user] = status;
    }
    
    function updateVolatility(PoolKey calldata key, uint256 newVol) external {
        volatilityIndex[key.toId()] = newVol;
    }
}
