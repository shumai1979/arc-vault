import { ethers } from 'ethers';

// Arc Testnet RPC
const RPC_URL = 'https://testnet.arcscan.app/rpc';

// Our Deployed Contracts
const REGISTRY_ADDRESS = '0x7199b07975D22C6A2AD2a0EdE47bd434b9a00745';
const VAULT_ADDRESS = '0xF10a90f7ae599c43da0bE945401d8EB588854d97';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { userPrompt, simulatedApy } = req.body;
    console.log("Agent received prompt:", userPrompt);

    // ZERO WALLET RISK: The agent uses its own isolated Testnet wallet to pay gas.
    // In production, this private key would be in Vercel Environment Variables.
    // For this demo, we use a randomly generated testnet wallet that we will fund with testnet gas.
    // Or we just return the transaction payload for the user to simulate if we don't want to manage private keys at all!
    // But since the agent is autonomous, we will simulate the "AI" decision here.
    
    // 1. Simulate AI reading market conditions
    let targetApy = 5; // Default 5%
    if (userPrompt && userPrompt.includes('10%')) targetApy = 10;
    
    let decision = "HOLD";
    let action = "No action needed.";
    let simulatedSuccess = true;

    if (simulatedApy < targetApy) {
      decision = "REBALANCE";
      action = `APY (${simulatedApy}%) is below target (${targetApy}%). Rebalancing to next optimal pool.`;
    } else {
        action = `APY (${simulatedApy}%) is meeting target (${targetApy}%). Holding steady.`;
    }

    // Return the Agent's decision and the required action
    // To strictly enforce ZERO WALLET RISK and ZERO COST, this endpoint just acts as the "Oracle / AI Brain".
    // It returns the decision, and the frontend can execute it if it wants, OR in a real autonomous setup, 
    // the Vercel backend would sign and broadcast it using `ethers.Wallet`.
    
    return res.status(200).json({
      agentStatus: "ONLINE",
      decision: decision,
      reasoning: action,
      reputationImpact: decision === "REBALANCE" ? "+5" : "0",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Agent Error:", error);
    return res.status(500).json({ error: 'Agent execution failed.' });
  }
}
