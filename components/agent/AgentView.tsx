"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { Bot, RefreshCw, Wallet, ChevronDown } from "lucide-react";
import { ActivityRow } from "./ActivityRow";
import type { Activity } from "./ActivityRow";
import { createClient } from "@/utils/supabase/client";

interface AgentConfig {
  wallet_address: string;
  daily_budget_usdc: number;
  is_active: boolean;
  permission_expires_at: string;
  spend_permission_json?: object;
}

export default function AgentView() {
  const { authenticated, login } = usePrivy();
  const { address } = useAccount();
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!address) { if (!authenticated) setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [configRes, activityRes] = await Promise.all([
        fetch(`/api/agent/permission/store?wallet=${address}`),
        fetch(`/api/agent/trades?wallet=${address}&page=0`),
      ]);
      const { config } = await configRes.json();
      const { activity: fetched, hasMore: more } = await activityRes.json();
      setConfig(config);
      setActivity(fetched ?? []);
      setHasMore(more ?? false);
      setPage(0);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [address]);

  const loadMore = useCallback(async () => {
    if (!address || loadingMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/agent/trades?wallet=${address}&page=${nextPage}`);
      const { activity: fetched, hasMore: more } = await res.json();
      setActivity((prev) => [...prev, ...(fetched ?? [])]);
      setHasMore(more ?? false);
      setPage(nextPage);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [address, page, loadingMore]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!address) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`activity:${address.toLowerCase()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity",
          filter: `wallet_address=eq.${address.toLowerCase()}`,
        },
        (payload) => {
          setActivity((prev) => [payload.new as Activity, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [address]);

  // ── No wallet ──────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="space-y-6">
        <div className="bg-[#181818] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_auto] px-5 py-3 border-b border-white/[0.06] gap-4 md:gap-6">
            <span className="text-white/30 text-xs font-medium">Action</span>
            <span className="text-white/30 text-xs font-medium text-right">Amount</span>
            <span className="hidden md:block text-white/30 text-xs font-medium text-right w-28">Date</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Wallet size={36} className="text-white/20" />
            <p className="text-white/40 text-sm">Connect your wallet to view agent activity</p>
            <button onClick={login}
              className="flex items-center gap-2 px-6 py-1.5 rounded-lg bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors cursor-pointer">
              <Wallet size={15} /> Connect wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-end">
          <div className="h-7 w-20 bg-white/5 rounded-lg animate-pulse" />
        </div>
        {/* Table skeleton */}
        <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#181818]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`flex items-center gap-4 px-5 py-4 ${i < 5 ? "border-b border-white/[0.04]" : ""}`}>
              <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-28 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
              <div className="hidden md:block h-4 w-20 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Content ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-end">
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-white text-xs font-semibold bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#181818] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_auto] px-5 py-3 border-b border-white/[0.06] gap-4 md:gap-6">
          <span className="text-white/30 text-xs font-medium">Action</span>
          <span className="text-white/30 text-xs font-medium text-right">Amount</span>
          <span className="hidden md:block text-white/30 text-xs font-medium text-right w-28">Date</span>
        </div>
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Bot size={36} className="text-white/20" />
            <p className="text-white/40 text-sm">No activity yet</p>
            <p className="text-white/20 text-xs">All your app transactions will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {activity.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full flex items-center justify-center gap-2 py-3 text-white/40 hover:text-white text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {loadingMore ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <ChevronDown size={14} />
          )}
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
