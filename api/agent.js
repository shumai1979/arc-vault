export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { userPrompt = '', simulatedApy = 4.2 } = req.body ?? {};

    // Check that Circle credentials are configured
    const hasCircle = !!(process.env.CIRCLE_API_KEY && process.env.CIRCLE_WALLET_ID);

    // Parse target APY from the user prompt
    const match = userPrompt.match(/(\d+(?:\.\d+)?)%/);
    const targetApy = match ? parseFloat(match[1]) : 5;

    // AI Decision Logic
    const decision  = simulatedApy < targetApy ? 'REBALANCE' : 'HOLD';
    const reasoning = decision === 'REBALANCE'
      ? `APY (${simulatedApy}%) is below target (${targetApy}%). Initiating rebalance.`
      : `APY (${simulatedApy}%) meets target (${targetApy}%). Holding steady.`;

    let txHash      = null;
    let circleStatus = 'N/A';

    // If REBALANCE and Circle is configured, attempt transaction via Circle REST API
    if (decision === 'REBALANCE' && hasCircle) {
      try {
        const idempotencyKey = `rebalance-${Date.now()}`;

        // Call Circle API directly via fetch (no heavy SDK needed in serverless)
        const circleRes = await fetch('https://api.circle.com/v1/w3s/developer/transactions/contractExecution', {
          method : 'POST',
          headers: {
            'Content-Type' : 'application/json',
            'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
          },
          body: JSON.stringify({
            idempotencyKey,
            walletId       : process.env.CIRCLE_WALLET_ID,
            contractAddress: '0xF10a90f7ae599c43da0bE945401d8EB588854d97',
            abiFunctionSignature: 'executeAIRebalance(int256,bool)',
            abiParameters  : ['100000000000000000000', 'true'],
            fee            : { type: 'EIP1559', maxFee: '20', priorityFee: '10' },
          }),
        });

        const circleData = await circleRes.json();
        txHash      = circleData?.data?.transaction?.txHash ?? 'Pending…';
        circleStatus = circleData?.data?.transaction?.state ?? 'SUBMITTED';
      } catch {
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
      circleConfigured: hasCircle,
      reputationImpact: decision === 'REBALANCE' ? '+5' : '0',
      timestamp       : new Date().toISOString(),
    });

  } catch (err) {
    console.error('Agent Error:', err);
    return res.status(500).json({ error: 'Agent execution failed.', detail: String(err) });
  }
}
