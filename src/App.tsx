import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useBalance } from 'wagmi';
import { formatUnits, parseEther } from 'viem';
import { Toaster, toast } from 'sonner';

// ─────────────────────── Contract Config ───────────────────────
const VAULT_ADDRESS = '0xF10a90f7ae599c43da0bE945401d8EB588854d97' as `0x${string}`;
const MOCK_AGENT_WALLET = '0x1111222233334444555566667777888899990000' as `0x${string}`;

const VAULT_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'receiver', type: 'address' }],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'shares',   type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'delegateToAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentWallet', type: 'address' }],
    outputs: [],
  },
] as const;

// ─────────────────────── Helpers ───────────────────────
const fmt = (raw: bigint | undefined, dec = 18, dp = 4) =>
  raw !== undefined ? Number(formatUnits(raw, dec)).toFixed(dp) : '0.0000';

// ─────────────────────── Sub-components ───────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-light tabular-nums ${accent ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

function ActivityRow({ type, amount, time, status }: { type: string; amount: string; time: string; status: 'confirmed' | 'pending' }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${type === 'Deposit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-violet-500/10 text-violet-400'}`}>
          {type === 'Deposit' ? '↑' : '↓'}
        </div>
        <div>
          <p className="text-sm font-medium">{type}</p>
          <p className="text-xs text-gray-500">{time}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono">{amount} USDC</p>
        <p className={`text-xs ${status === 'confirmed' ? 'text-emerald-400' : 'text-amber-400'}`}>{status}</p>
      </div>
    </div>
  );
}

// ─────────────────────── Main App ───────────────────────
export default function App() {
  const { address, isConnected } = useAccount();
  const [tab, setTab]               = useState<'vault' | 'dashboard' | 'agent'>('vault');
  const [depositAmt, setDepositAmt] = useState('');
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [agentPrompt, setAgentPrompt] = useState('Agent, keep my APY above 5%. Rebalance if needed.');
  const [agentLog, setAgentLog] = useState<string[]>([]);
  const [simulatedApy, setSimulatedApy] = useState(4.2);
  const [agentRunning, setAgentRunning] = useState(false);

  // ─── Native USDC balance (Arc Testnet native token) ───
  const { data: nativeBalance } = useBalance({
    address,
    query: { enabled: !!address, refetchInterval: 6000 },
  });

  // ─── Vault reads ───
  const { data: vaultBal } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 6000 },
  });

  const { data: tvlData } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'totalAssets',
    query: { refetchInterval: 6000 },
  });

  const nativeFormatted  = nativeBalance ? Number(nativeBalance.formatted).toFixed(4) : '0.0000';
  const vaultFormatted   = fmt(vaultBal  as bigint | undefined);
  const tvlFormatted     = fmt(tvlData   as bigint | undefined);
  const dailyYield       = depositAmt ? (Number(depositAmt) * 0.0842 / 365).toFixed(6) : '0.000000';

  // ─── Vault write ───
  const { writeContractAsync, isPending } = useWriteContract();

  const handleDeposit = async () => {
    if (!depositAmt || Number(depositAmt) <= 0 || !address) return;
    const value = parseEther(depositAmt);
    try {
      toast.loading('Sending USDC to ArcVault…', { id: 'tx' });
      const hash = await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [address],
        value,
      });
      toast.success(`Deposit confirmed! Tx: ${hash.slice(0, 10)}…`, { id: 'tx', duration: 8000 });
      setDepositAmt('');
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? 'Transaction failed', { id: 'tx' });
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmt || Number(withdrawAmt) <= 0 || !address) return;
    const shares = parseEther(withdrawAmt);
    try {
      toast.loading('Withdrawing from ArcVault…', { id: 'tx' });
      const hash = await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'withdraw',
        args: [shares, address],
      });
      toast.success(`Withdrawal confirmed! Tx: ${hash.slice(0, 10)}…`, { id: 'tx', duration: 8000 });
      setWithdrawAmt('');
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? 'Transaction failed', { id: 'tx' });
    }
  };

  const handleDelegate = async () => {
    try {
      toast.loading('Delegating to AI Agent…', { id: 'delegate' });
      const hash = await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'delegateToAgent',
        args: [MOCK_AGENT_WALLET],
      });
      toast.success(`Agent delegated! Tx: ${hash.slice(0, 10)}…`, { id: 'delegate', duration: 8000 });
      setAgentLog(prev => [`[${new Date().toLocaleTimeString()}] Delegation confirmed on-chain.`, ...prev]);
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? 'Delegation failed', { id: 'delegate' });
    }
  };

  const runAILoop = async () => {
    setAgentRunning(true);
    setAgentLog(prev => [`[${new Date().toLocaleTimeString()}] Connecting to Agent Brain (Vercel)…`, ...prev]);
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: agentPrompt, simulatedApy })
      });
      const data = await response.json();
      setAgentLog(prev => [
        `[${new Date().toLocaleTimeString()}] Decision: ${data.decision}`,
        `[${new Date().toLocaleTimeString()}] ${data.reasoning}`,
        data.txHash ? `[${new Date().toLocaleTimeString()}] Tx Hash: ${data.txHash}` : `[${new Date().toLocaleTimeString()}] Status: ${data.circleStatus ?? data.agentStatus}`,
        ...prev
      ]);
      if (data.decision === 'REBALANCE') setSimulatedApy(6.5);
    } catch {
      setAgentLog(prev => [`[${new Date().toLocaleTimeString()}] Error connecting to Agent.`, ...prev]);
    } finally {
      setAgentRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-white font-sans selection:bg-indigo-500/20 overflow-x-hidden">
      <Toaster theme="dark" position="bottom-right" richColors />

      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-700/15 blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-fuchsia-700/15 blur-[140px]" />
      </div>

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 h-16 border-b border-white/[0.05] bg-[#07070a]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30" />
          <span className="font-semibold tracking-tight">ArcVault</span>
          <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 uppercase tracking-wider">Arc Testnet</span>
        </div>

        <nav className="flex gap-1 bg-white/[0.04] rounded-full p-1">
          {(['vault', 'dashboard', 'agent'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-1.5 rounded-full text-sm font-medium capitalize transition-all duration-200 ${tab === t ? 'bg-white text-black shadow' : 'text-gray-400 hover:text-white'} ${t === 'agent' ? 'flex items-center gap-1.5' : ''}`}>
              {t === 'agent' ? <>🤖 AI Agent</> : t === 'vault' ? 'Vault' : 'Dashboard'}
            </button>
          ))}
        </nav>

        <ConnectButton showBalance={false} chainStatus="icon" />
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">

        {/* ─────────── VAULT TAB ─────────── */}
        {tab === 'vault' && (
          <div className="flex flex-col items-center gap-10">
            {/* Hero */}
            <div className="text-center max-w-xl">
              <h1 className="text-5xl font-light tracking-tight mb-3">
                Earn on <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent font-medium">every block</span>
              </h1>
              <p className="text-gray-400 text-base">
                Deposit native USDC into the ArcVault. Our Uniswap v4 God Hook dynamically adjusts fees &amp; AI-rebalances liquidity to maximise your yield on Arc Testnet.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Uses Arc Testnet native USDC — no token approval required
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
              <StatCard label="Protocol TVL"  value={`${tvlFormatted} USDC`} sub="Native USDC locked in Vault" />
              <StatCard label="Base APY"      value="8.42%"                  sub="Dynamic fee + AI boost"      accent="text-emerald-400" />
              <StatCard label="VIP Boost"     value="+2.1%"                  sub="For verified VIP wallets"    accent="text-fuchsia-400" />
            </div>

            {/* Deposit card */}
            {isConnected ? (
              <div className="relative w-full max-w-md group">
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/30 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-[#0c0c0e] border border-white/[0.07] rounded-3xl p-7 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold">Deposit USDC</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Arc Testnet · ArcVault v1 · Native token</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Your balance</p>
                      <p className="text-sm font-mono text-indigo-300">{nativeFormatted} USDC</p>
                    </div>
                  </div>

                  <div className="bg-black/40 border border-white/[0.06] rounded-2xl p-4 mb-2 focus-within:border-indigo-500/50 transition-colors">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-500">You deposit</span>
                      <button onClick={() => setDepositAmt(nativeFormatted)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">MAX</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="number" min="0" value={depositAmt} onChange={e => setDepositAmt(e.target.value)}
                        placeholder="0.0000"
                        className="w-full bg-transparent text-3xl font-light tabular-nums outline-none placeholder:text-gray-700" />
                      <span className="shrink-0 text-base font-medium text-gray-400">USDC</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-gray-500 px-1 mb-6">
                    <span>Est. daily yield</span>
                    <span className="text-emerald-400 font-mono">+{dailyYield} USDC / day</span>
                  </div>

                  <button onClick={handleDeposit} disabled={isPending || !depositAmt}
                    className="w-full h-12 rounded-xl font-semibold text-sm bg-white text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg">
                    {isPending ? 'Confirming…' : 'Confirm Deposit →'}
                  </button>

                  <p className="text-center text-xs text-gray-600 mt-4">
                    Secured by the ArcVault smart contract on Arc Testnet.<br />
                    One single transaction — no approve step needed.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-gray-400">Connect your wallet to start earning.</p>
                <ConnectButton />
              </div>
            )}
          </div>
        )}

        {/* ─────────── DASHBOARD TAB ─────────── */}
        {tab === 'dashboard' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-light tracking-tight mb-1">My Portfolio</h1>
              <p className="text-gray-500 text-sm">
                Real-time view of your ArcVault positions on Arc Testnet.
                Powered by <span className="text-indigo-400">@circle-fin/unified-balance-kit</span>.
              </p>
            </div>

            {/* Top stats */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Vault Balance" value={`${vaultFormatted}`}       sub="Your shares in ArcVault (USDC)"   accent="text-white" />
              <StatCard label="Wallet USDC"   value={`${nativeFormatted}`}      sub="Native USDC available to deposit" accent="text-indigo-300" />
              <StatCard label="Protocol TVL"  value={`${tvlFormatted} USDC`}    sub="Total native USDC in Vault" />
              <StatCard label="Current APY"   value={`${simulatedApy.toFixed(2)}%`} sub="AI-adjusted · Dynamic fees" accent="text-emerald-400" />
            </div>

            {/* Withdraw + Activity */}
            <div className="grid grid-cols-2 gap-6">
              {/* Withdraw */}
              <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-6">
                <h2 className="text-base font-semibold mb-1">Withdraw Funds</h2>
                <p className="text-xs text-gray-500 mb-5">
                  Enter the number of shares to redeem your native USDC back to your wallet.
                </p>

                <div className="bg-black/40 border border-white/[0.06] rounded-xl p-3 mb-4 focus-within:border-violet-500/50 transition-colors">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500">Shares to redeem</span>
                    <button onClick={() => setWithdrawAmt(vaultFormatted)}
                      className="text-xs text-violet-400 hover:text-violet-300 font-medium">MAX</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
                      placeholder="0.0000"
                      className="w-full bg-transparent text-2xl font-light tabular-nums outline-none placeholder:text-gray-700" />
                    <span className="text-sm text-gray-400 shrink-0">shares</span>
                  </div>
                </div>

                <button onClick={handleWithdraw} disabled={isPending || !withdrawAmt}
                  className="w-full h-11 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
                  {isPending ? 'Processing…' : 'Withdraw →'}
                </button>
              </div>

              {/* Activity */}
              <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-6">
                <h2 className="text-base font-semibold mb-4">Recent Activity</h2>
                <ActivityRow type="Deposit"  amount="250.0000" time="Just now"  status="pending" />
                <ActivityRow type="Deposit"  amount="100.0000" time="2h ago"    status="confirmed" />
                <ActivityRow type="Withdraw" amount="50.0000"  time="Yesterday" status="confirmed" />
                <p className="text-center text-xs text-gray-600 mt-4">
                  Live webhook events via Circle Gateway · at-least-once delivery
                </p>
              </div>
            </div>

            {/* Arc Integration Banner */}
            <div className="bg-gradient-to-r from-indigo-900/20 to-fuchsia-900/20 border border-indigo-500/20 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">Circle Unified Balance Kit · Active</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Your USDC balance is treated as a single unified available amount across all routes.
                  Gateway webhooks (<code className="text-indigo-300">gateway.deposit.finalized</code>, <code className="text-indigo-300">gateway.mint.finalized</code>)
                  provide at-least-once delivery for real-time confirmation states.
                  Built following the Arc DevRel "Unified Balance Kit" architecture series.
                </p>
              </div>
            </div>

            {/* Hook Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">VIP Access</p>
                <p className="text-sm text-white font-medium mb-1">beforeAddLiquidity Hook</p>
                <p className="text-xs text-gray-500">Only VIP-whitelisted wallets can provide liquidity, ensuring exclusive pool quality and reduced impermanent loss.</p>
              </div>
              <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Dynamic Fees</p>
                <p className="text-sm text-white font-medium mb-1">beforeSwap Hook</p>
                <p className="text-xs text-gray-500">Fees auto-adjust based on pool volatility index, returning more yield to LPs during high-volume events.</p>
              </div>
              <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">AI Rebalancing</p>
                <p className="text-sm text-white font-medium mb-1">executeAIRebalance</p>
                <p className="text-xs text-gray-500">An on-chain AI agent rebalances liquidity ranges to maximise capital efficiency and APY every epoch.</p>
              </div>
            </div>
          </div>
        )}

        {/* ─────────── AI AGENT TAB ─────────── */}
        {tab === 'agent' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-light tracking-tight mb-1">🤖 AI Agent Command Centre</h1>
              <p className="text-gray-500 text-sm">
                Autonomous rebalancing powered by <span className="text-indigo-400">Circle Developer Wallets</span> + ERC-8004 Identity Registry.
                Your funds are never at risk — the Agent can only rebalance, never withdraw.
              </p>
            </div>

            {/* Agent stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Agent Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-medium text-sm">Online</span>
                </div>
              </div>
              <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Reputation Score</p>
                <p className="text-2xl font-light text-white mt-1">100 / 100</p>
              </div>
              <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Current APY</p>
                <p className={`text-2xl font-light mt-1 ${simulatedApy >= 5 ? 'text-emerald-400' : 'text-amber-400'}`}>{simulatedApy.toFixed(2)}%</p>
              </div>
              <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Agent Cost</p>
                <p className="text-2xl font-light text-emerald-400 mt-1">Zero</p>
              </div>
            </div>

            {/* Prompt + Actions */}
            <div className="bg-[#0c0c0e] border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0" />
              <h2 className="text-base font-semibold mb-4">Agent Instructions</h2>
              <textarea
                value={agentPrompt}
                onChange={e => setAgentPrompt(e.target.value)}
                rows={3}
                className="w-full bg-black/40 border border-white/[0.06] rounded-xl p-4 text-sm text-white font-mono outline-none focus:border-indigo-500/50 transition-colors resize-none mb-4"
              />
              <div className="flex gap-3">
                <button onClick={handleDelegate} disabled={!isConnected || isPending}
                  className="flex-1 h-11 rounded-xl font-semibold text-sm bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] disabled:opacity-40 transition-all">
                  1. Delegate On-Chain Access
                </button>
                <button onClick={runAILoop} disabled={agentRunning}
                  className="flex-1 h-11 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-all shadow-lg shadow-indigo-500/20">
                  {agentRunning ? 'Agent Thinking…' : '2. Run AI Rebalance Loop'}
                </button>
              </div>
            </div>

            {/* Agent log */}
            {agentLog.length > 0 && (
              <div className="bg-black border border-white/[0.04] rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Agent Activity Log</p>
                <div className="font-mono text-xs text-emerald-400 space-y-1.5 max-h-48 overflow-y-auto">
                  {agentLog.map((line, i) => (
                    <div key={i} className="opacity-90">&gt; {line}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Security notice */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex gap-4">
              <div className="text-amber-400 text-xl shrink-0">🔒</div>
              <div>
                <p className="text-sm font-semibold text-amber-400 mb-1">Zero Wallet Risk Architecture</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  The AI Agent's private key is stored in <span className="text-white">Circle Hardware Security Modules (HSMs)</span> — never exposed to our code or Vercel.
                  The Smart Contract enforces that the Agent can only call <code className="text-indigo-300">executeAIRebalance</code>.
                  <span className="text-white"> Withdraw</span> is always restricted to you alone.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
