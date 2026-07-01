import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { ethers } from 'ethers';
import forge from 'node-forge';

const VAULT_ADDRESS = '0xF10a90f7ae599c43da0bE945401d8EB588854d97';
const HOOK_ADDRESS  = '0x0000000000000000000000000000000000000000'; // placeholder

const HOOK_ABI = [
  {
    "inputs": [
      { "internalType": "int256", "name": "amountToRebalance", "type": "int256" },
      { "internalType": "bool", "name": "simulatedSuccess", "type": "bool" }
    ],
    "name": "executeAIRebalance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

function getCircleClient() {
  const apiKey        = process.env.CIRCLE_API_KEY;
  const entitySecret  = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    throw new Error('CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET not set in environment variables.');
  }

  return initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
}

function encryptEntitySecret(entitySecret, publicKeyPem) {
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
  const encrypted = publicKey.encrypt(
    forge.util.hexToBytes(entitySecret),
    'RSA-OAEP',
    { md: forge.md.sha256.create(), mgf1: { md: forge.md.sha256.create() } }
  );
  return forge.util.encode64(encrypted);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { userPrompt, simulatedApy } = req.body;
    const walletId     = process.env.CIRCLE_WALLET_ID;
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

    if (!walletId) {
      return res.status(500).json({ error: 'CIRCLE_WALLET_ID not configured.' });
    }

    // 1. Parse the target APY from the user prompt
    let targetApy = 5;
    if (userPrompt && userPrompt.match(/(\d+)%/)) {
      targetApy = parseInt(userPrompt.match(/(\d+)%/)[1]);
    }

    const currentApy = simulatedApy || 4.2;

    // 2. AI Decision Logic
    let decision  = 'HOLD';
    let reasoning = `APY (${currentApy}%) meets target (${targetApy}%). Holding steady.`;

    if (currentApy < targetApy) {
      decision  = 'REBALANCE';
      reasoning = `APY (${currentApy}%) is below target (${targetApy}%). Initiating rebalance via Circle Wallet.`;
    }

    let txHash      = null;
    let circleStatus = 'N/A';

    // 3. If REBALANCE, execute via Circle Developer Wallet
    if (decision === 'REBALANCE') {
      try {
        const client = getCircleClient();

        // Get Circle public key and encrypt entity secret for this request
        const pkResponse           = await client.getPublicKey();
        const entitySecretCiphertext = encryptEntitySecret(entitySecret, pkResponse.data.publicKey);

        // Encode the contract call
        const iface       = new ethers.Interface(HOOK_ABI);
        const callData    = iface.encodeFunctionData('executeAIRebalance', [
          ethers.parseEther('100'), // rebalance 100 USDC
          true
        ]);

        // Send the transaction via Circle (they sign it securely)
        const txResponse = await client.createTransaction({
          walletId,
          contractAddress : VAULT_ADDRESS,
          callData,
          fee             : { type: 'EIP1559', maxFee: '20', priorityFee: '10' },
          entitySecretCiphertext,
          idempotencyKey  : `rebalance-${Date.now()}`
        });

        txHash      = txResponse?.data?.transaction?.txHash || 'Pending...';
        circleStatus = txResponse?.data?.transaction?.state || 'SUBMITTED';
      } catch (circleErr) {
        console.warn('Circle TX failed (testnet may not support this call yet):', circleErr?.response?.data || circleErr.message);
        txHash      = 'SIMULATED (testnet)';
        circleStatus = 'SIMULATED';
      }
    }

    return res.status(200).json({
      agentStatus     : 'ONLINE',
      decision,
      reasoning,
      txHash,
      circleStatus,
      reputationImpact: decision === 'REBALANCE' ? '+5' : '0',
      timestamp       : new Date().toISOString()
    });

  } catch (error) {
    console.error('Agent Error:', error);
    return res.status(500).json({ error: 'Agent execution failed.', detail: error.message });
  }
}
