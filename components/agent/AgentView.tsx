"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import {
  Bot, Zap, ZapOff, Loader2, Clock, TrendingUp,
  TrendingDown, AlertCircle, ExternalLink, RefreshCw,
} from "lucide-react";

interface AgentConfig {
  wallet_address: string;
  daily_budget_usdc: number;
  is_active: boolean;
  permission_expires_at: string;
  updated_at: string;
  spend_permission_json?: object;
}

interface AgentTrade {
  id: string;
  ticker: string;
  side: "buy" | "sell";
  amount_usdc: number;
  shares: number;
  price: number;
  tx_hash: string;
  signal_score: number;
  created_at: string;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AgentView() {
  const { address } = useAccount();
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [trades, setTrades] = useState<AgentTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    if (!address) { setLoading(false); return; }
    try {
      const [configRes, tradesRes] = await Promise.all([
        fetch(`/api/agent/permission/store?wallet=${address}`),
        fetch(`/api/agent/trades?wallet=${address}`),
      ]);
      const { config } = await configRes.json();
      const { trades } = await tradesRes.json();
      setConfig(config);
      setTrades(trades ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleAgent() {
    if (!config || !address) return;
    setToggling(true);
    try {
      await fetch("/api/agent/permission/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          permission: config.spend_permission_json ?? {},
          budgetUsdc: config.daily_budget_usdc,
          periodDays: 30,
          isActive: !config.is_active,
        }),
      });
      setConfig((prev) => prev ? { ...prev, is_active: !prev.is_active } : prev);
    } finally {
      setToggling(false);
    }
  }

  if (!address) {
    return (
      <div className="px-6 py-20 flex flex-col items-center gap-3 text-center">
        <Bot size={40} className="text-white/20" />
        <p className="text-white/40 text-sm">Connect your wallet to view the agent</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-6 py-20 flex items-center justify-center">
        <Loader2 size={24} className="text-white/30 animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="px-6 py-20 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
          <Bot size={28} className="text-white/30" />
        </div>
        <div>
          <p className="text-white font-semibold">Agent not activated</p>
          <p className="text-white/40 text-sm mt-1 max-w-xs">
            Go to the chat and say "activate the agent" to get started
          </p>
        </div>
        <a
          href="/"
          className="mt-2 px-5 py-2.5 rounded-xl bg-[#a8ff78] text-black text-sm font-semibold hover:bg-[#96f060] transition-colors"
        >
          Open Chat
        </a>
      </div>
    );
  }

  const isExpired = new Date(config.permission_expires_at) < new Date();
  const expiresIn = Math.max(0, Math.ceil(
    (new Date(config.permission_expires_at).getTime() - Date.now()) / 86400000
  ));

  const totalSpent = trades.reduce((sum, t) => sum + (t.side === "buy" ? t.amount_usdc : 0), 0);

  return (
    <div className="px-6 pb-10 space-y-4">

      {/* Status card */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.is_active && !isExpired ? "bg-[#a8ff78]/15" : "bg-white/5"}`}>
              <Bot size={20} className={config.is_active && !isExpired ? "text-[#a8ff78]" : "text-white/30"} />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Trading Agent</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${config.is_active && !isExpired ? "bg-[#a8ff78] animate-pulse" : "bg-white/20"}`} />
                <p className="text-xs text-white/40">
                  {isExpired ? "Permission expired" : config.is_active ? "Active — runs every 4h" : "Paused"}
                </p>
              </div>
            </div>
          </div>

          {!isExpired && (
            <button
              onClick={toggleAgent}
              disabled={toggling}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                config.is_active
                  ? "bg-white/10 hover:bg-white/15 text-white/70"
                  : "bg-[#a8ff78]/15 hover:bg-[#a8ff78]/25 text-[#a8ff78]"
              }`}
            >
              {toggling ? <Loader2 size={12} className="animate-spin" /> : config.is_active ? <ZapOff size={12} /> : <Zap size={12} />}
              {config.is_active ? "Pause" : "Resume"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#111] rounded-xl px-3 py-2.5">
            <p className="text-white/40 text-xs mb-1">Daily budget</p>
            <p className="text-white font-semibold text-sm">${config.daily_budget_usdc} USDC</p>
          </div>
          <div className="bg-[#111] rounded-xl px-3 py-2.5">
            <p className="text-white/40 text-xs mb-1">Expires in</p>
            <p className={`font-semibold text-sm ${isExpired ? "text-red-400" : expiresIn < 5 ? "text-yellow-400" : "text-white"}`}>
              {isExpired ? "Expired" : `${expiresIn}d`}
            </p>
          </div>
          <div className="bg-[#111] rounded-xl px-3 py-2.5">
            <p className="text-white/40 text-xs mb-1">Total spent</p>
            <p className="text-white font-semibold text-sm">{fmt(totalSpent)}</p>
          </div>
        </div>

        {isExpired && (
          <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <AlertCircle size={13} className="text-red-400 shrink-0" />
            <p className="text-red-400 text-xs">Permission expired — go to chat to reactivate the agent</p>
          </div>
        )}
      </div>

      {/* Trade history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Agent Trades</p>
          <button onClick={fetchData} className="p-1 rounded-lg text-white/30 hover:text-white transition-colors cursor-pointer">
            <RefreshCw size={13} />
          </button>
        </div>

        {trades.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-5 py-10 flex flex-col items-center gap-2 text-center">
            <Clock size={28} className="text-white/20" />
            <p className="text-white/40 text-sm">No trades yet</p>
            <p className="text-white/25 text-xs">The agent runs every 4 hours and trades when signals are strong</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trades.map((trade) => (
              <div key={trade.id} className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${trade.side === "buy" ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                  {trade.side === "buy"
                    ? <TrendingUp size={14} className="text-emerald-400" />
                    : <TrendingDown size={14} className="text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-semibold">{trade.side === "buy" ? "Bought" : "Sold"} {trade.ticker}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${trade.side === "buy" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                      {trade.side.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">
                    {fmt(trade.amount_usdc)} · {trade.shares?.toFixed(6)} shares · signal {trade.signal_score?.toFixed(0)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white/40 text-xs">{timeAgo(trade.created_at)}</p>
                  {trade.tx_hash && (
                    <a
                      href={`https://basescan.org/tx/${trade.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 mt-0.5 justify-end"
                    >
                      <ExternalLink size={10} />
                      tx
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
