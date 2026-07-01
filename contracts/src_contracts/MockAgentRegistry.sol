// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Mock ERC-8004 Agent Identity Registry
/// @notice A simplified version of ERC-8004 for Arc Testnet
contract MockAgentRegistry {
    struct Agent {
        bool isRegistered;
        uint256 reputationScore;
        string name;
    }

    mapping(address => Agent) public agents;

    event AgentRegistered(address indexed agentWallet, string name);
    event ReputationUpdated(address indexed agentWallet, uint256 newScore);

    function registerAgent(string memory name) external {
        agents[msg.sender] = Agent({
            isRegistered: true,
            reputationScore: 100, // Start with 100 base score
            name: name
        });
        emit AgentRegistered(msg.sender, name);
    }

    function updateReputation(address agentWallet, int256 delta) external {
        require(agents[agentWallet].isRegistered, "Agent not registered");
        // Simplified: anyone can update in this mock. In reality, only verified protocols can.
        if (delta > 0) {
            agents[agentWallet].reputationScore += uint256(delta);
        } else {
            uint256 penalty = uint256(-delta);
            if (agents[agentWallet].reputationScore > penalty) {
                agents[agentWallet].reputationScore -= penalty;
            } else {
                agents[agentWallet].reputationScore = 0;
            }
        }
        emit ReputationUpdated(agentWallet, agents[agentWallet].reputationScore);
    }

    function isAgentValid(address agentWallet) external view returns (bool) {
        return agents[agentWallet].isRegistered && agents[agentWallet].reputationScore >= 50;
    }
}
