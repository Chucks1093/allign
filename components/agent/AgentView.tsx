"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { Bot, Loader2, RefreshCw } from "lucide-react";
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
  const { address } = useAccount();
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!address) { setLoading(false); return; }
    try {
      const [configRes, activityRes] = await Promise.all([
        fetch(`/api/agent/permission/store?wallet=${address}`),
        fetch(`/api/agent/trades?wallet=${address}`),
      ]);
      const { config } = await configRes.json();
      const { activity: fetched } = await activityRes.json();
      setConfig(config);
      setActivity(fetched ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [address]);

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

  if (!address) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-center">
        <Bot size={40} className="text-white/20" />
        <p className="text-white/40 text-sm">Connect your wallet to view the agent</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 size={24} className="text-white/30 animate-spin" />
      </div>
    );
  }

  const rows = activity;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] px-5 py-3 border-b border-white/[0.06] gap-6">
          <span className="text-white/30 text-xs font-medium">Action</span>
          <span className="text-white/30 text-xs font-medium text-right">Amount</span>
          <span className="text-white/30 text-xs font-medium text-right w-28">Date</span>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {rows.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}
