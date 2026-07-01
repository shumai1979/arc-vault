declare global {
  namespace JSX {
    interface IntrinsicElements {
      'w3m-button': any;
    }
  }
}

import { useState } from 'react';
import { useAccount, useBalance, useWriteContract, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Bot, ArrowRight, ShieldCheck, Activity, Database } from 'lucide-react';

const ARC_VAULT_ADDRESS = "0xF10a90f7ae599c43da0bE945401d8EB588854d97";
// removed registry address
const MOCK_AGENT_WALLET = "0x1111222233334444555566667777888899990000"; // Fake wallet representing the Agent

// Simplified ABI
const VAULT_ABI = [
  { "inputs": [{ "internalType": "address", "name": "receiver", "type": "address" }], "name": "deposit", "outputs": [{ "internalType": "uint256", "name": "shares", "type": "uint256" }], "stateMutability": "payable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "agentWallet", "type": "address" }], "name": "delegateToAgent", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

// removed registry abi

export default function App() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'deposit' | 'dashboard' | 'agent'>('deposit');
  const [amount, setAmount] = useState('');
  const [agentPrompt, setAgentPrompt] = useState('Agent, keep my APY above 5%. Rebalance if needed.');
  const [agentLog, setAgentLog] = useState<string[]>([]);
  const [simulatedApy, setSimulatedApy] = useState(4.2);

  // Read native USDC balance
  const { data: balance } = useBalance({ address });
  
  // Read Vault Shares
  const { data: vaultShares } = useReadContract({
    address: ARC_VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: !!address, refetchInterval: 5000 }
  });

  const { writeContract, isPending } = useWriteContract();

  const handleDeposit = () => {
    if (!amount) return;
    writeContract({
      address: ARC_VAULT_ADDRESS as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'deposit',
      args: [address as `0x${string}`],
      value: parseEther(amount)
    });
  };

  const handleDelegate = () => {
    writeContract({
      address: ARC_VAULT_ADDRESS as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'delegateToAgent',
      args: [MOCK_AGENT_WALLET as `0x${string}`]
    });
    setAgentLog(prev => ["Delegation transaction submitted to Arc Testnet.", ...prev]);
  };

  const runAILoop = async () => {
    setAgentLog(prev => ["Connecting to Agent Brain (Vercel Serverless)...", ...prev]);
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: agentPrompt, simulatedApy })
      });
      const data = await response.json();
      setAgentLog(prev => [
        `[Agent] Decision: ${data.decision}`,
        `[Agent] Reasoning: ${data.reasoning}`,
        `[Agent] Status: ${data.agentStatus}`,
        ...prev
      ]);
      if (data.decision === "REBALANCE") {
        setSimulatedApy(6.5); // APY recovered
      }
    } catch (e) {
      setAgentLog(prev => ["Error connecting to Agent.", ...prev]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0A0A0A] to-[#0A0A0A] pointer-events-none"></div>
      
      <nav className="relative z-10 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Database className="text-white w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">ArcVault</span>
              <span className="text-xs font-semibold text-blue-400 block -mt-1 tracking-wider uppercase">Native Testnet</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('deposit')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'deposit' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}>Vault</button>
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('agent')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'agent' ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white'}`}>
              <Bot className="w-4 h-4" /> AI Agent
            </button>
             {/* @ts-ignore */} <w3m-button />
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {!isConnected ? (
          <div className="text-center mt-20">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">The Next Evolution of DeFi</h1>
            <p className="text-xl text-white/50 mb-8 max-w-2xl mx-auto">Connect your wallet to experience frictionless native USDC deposits and autonomous AI-driven yields on the Arc Testnet.</p>
            <div className="flex justify-center"> {/* @ts-ignore */} <w3m-button /></div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {activeTab === 'deposit' && (
              <div className="bg-[#111111] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-semibold">Deposit Native USDC</h2>
                  <div className="text-sm text-white/60">
                    Wallet Balance: <span className="text-white font-medium">{balance?.formatted ? Number(balance.formatted).toFixed(4) : '0.00'} USDC</span>
                  </div>
                </div>
                
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 mb-6">
                  <div className="flex justify-between text-sm mb-2 text-white/60">
                    <span>Amount</span>
                    <span>~ {amount || '0'} Shares</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00" 
                      className="bg-transparent text-4xl font-semibold outline-none w-full placeholder-white/20"
                    />
                    <div className="flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-xl font-medium">
                      USDC
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleDeposit}
                  disabled={!amount || isPending}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                >
                  {isPending ? 'Confirming in Wallet...' : '1-Click Deposit'} <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-[#111111] border border-white/10 rounded-3xl p-8">
                  <div className="flex items-center gap-3 mb-4 text-white/60">
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                    <span>My Vault Balance</span>
                  </div>
                  <div className="text-4xl font-bold">
                    {vaultShares ? formatEther(vaultShares as bigint) : '0.00'} <span className="text-xl text-white/40">USDC</span>
                  </div>
                </div>
                
                <div className="bg-[#111111] border border-white/10 rounded-3xl p-8">
                  <div className="flex items-center gap-3 mb-4 text-white/60">
                    <Activity className="w-5 h-5 text-blue-400" />
                    <span>Current Strategy APY</span>
                  </div>
                  <div className="text-4xl font-bold text-green-400">
                    {simulatedApy.toFixed(2)}%
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'agent' && (
              <div className="bg-[#111111] border border-blue-500/30 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-semibold flex items-center gap-3">
                      <Bot className="text-blue-400" /> ERC-8004 AI Agent
                    </h2>
                    <p className="text-white/50 mt-2 text-sm">Autonomous rebalancing with zero wallet risk. Delegated via Smart Contract.</p>
                  </div>
                  <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div> Verified Registry
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                    <div className="text-xs text-white/50 mb-1">Reputation Score</div>
                    <div className="text-xl font-bold text-white">100 / 100</div>
                  </div>
                  <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                    <div className="text-xs text-white/50 mb-1">Cost</div>
                    <div className="text-xl font-bold text-green-400">Zero (Free)</div>
                  </div>
                  <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                    <div className="text-xs text-white/50 mb-1">Wallet Access</div>
                    <div className="text-xl font-bold text-blue-400">None (Rebalance Only)</div>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <label className="text-sm text-white/60 font-medium block">Agent Instruction Prompt:</label>
                  <textarea 
                    value={agentPrompt}
                    onChange={(e) => setAgentPrompt(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500/50 resize-none h-24 font-mono text-sm"
                  />
                </div>

                <div className="flex gap-4 mb-8">
                  <button 
                    onClick={handleDelegate}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-semibold transition-all flex justify-center items-center gap-2"
                  >
                    1. Delegate Contract Access
                  </button>
                  <button 
                    onClick={runAILoop}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all flex justify-center items-center gap-2"
                  >
                    <Activity className="w-4 h-4" /> 2. Run AI Rebalance Loop
                  </button>
                </div>

                {agentLog.length > 0 && (
                  <div className="bg-black border border-white/5 rounded-xl p-4 font-mono text-xs text-green-400 h-40 overflow-y-auto space-y-2">
                    {agentLog.map((log, i) => (
                      <div key={i} className="opacity-90">{"> "}{log}</div>
                    ))}
                  </div>
                )}

              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
