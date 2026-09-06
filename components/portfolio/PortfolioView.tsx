"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

interface Holding {
  ticker: string;
  name: string;
  logo: string;
  tokenTicker: string;
  shares: number;
  price: number;
  value: number;
  changePercent?: number;
}

interface PortfolioData {
  holdings: Holding[];
  totalValue: number;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function pct(n?: number) {
  if (n === undefined) return null;
  const positive = n >= 0;
  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
      {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {positive ? "+" : ""}{n.toFixed(2)}%
    </span>
  );
}

export default function PortfolioView() {
  const { address } = useAccount();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async (isRefresh = false) => {
    if (!address) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio?address=${address}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load portfolio");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [address]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-white/40 text-sm">Connect your wallet to view your portfolio</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-32 rounded-2xl bg-white/5 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-red-400/70 text-sm">{error}</p>
        <button onClick={() => fetchPortfolio()} className="text-sm text-white/50 hover:text-white underline underline-offset-4 transition-colors cursor-pointer">
          Try again
        </button>
      </div>
    );
  }

  if (!data || data.holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-white/40 text-sm">No tokenized stocks in your wallet yet</p>
        <a href="/explore" className="text-sm text-white/60 hover:text-white underline underline-offset-4 transition-colors">
          Browse stocks →
        </a>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Portfolio Value</p>
        <p className="text-4xl font-bold text-white">{fmt(data.totalValue)}</p>
        <p className="text-xs text-white/30 mt-3">{data.holdings.length} position{data.holdings.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white/60 uppercase tracking-wider">Holdings</p>
        <button
          onClick={() => fetchPortfolio(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {data.holdings.map((h) => (
          <div
            key={h.ticker}
            className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3.5 flex items-center justify-between hover:border-white/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{h.logo}</span>
              <div>
                <p className="text-sm font-semibold text-white">{h.name}</p>
                <p className="text-xs text-white/40">{h.shares.toFixed(6)} {h.tokenTicker}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{fmt(h.value)}</p>
              <div className="flex justify-end mt-0.5">
                {pct(h.changePercent) ?? <span className="text-xs text-white/30">{fmt(h.price)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
