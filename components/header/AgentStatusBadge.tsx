"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { Brain, Zap, Pause, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { getPermissionStatus } from "@base-org/account/spend-permission";

interface AgentConfig {
  daily_budget_usdc: number;
  is_active: boolean;
  permission_expires_at: string;
  spend_permission_json?: any;
}

interface PermStatus {
  isActive: boolean;
  isExpired: boolean;
  remainingSpend: bigint;
  currentPeriod: { spend: bigint };
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function fmtUsdc(wei: bigint) {
  return fmt(Number(wei) / 1e6);
}

export default function AgentStatusBadge() {
  const { address } = useAccount();
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [permStatus, setPermStatus] = useState<PermStatus | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    if (!address) return;
    try {
      const configRes = await fetch(`/api/agent/permission/store?wallet=${address}`);
      const { config } = await configRes.json();
      setConfig(config ?? null);
      if (config?.spend_permission_json) {
        const status = await getPermissionStatus(config.spend_permission_json, {
          rpcUrl: "https://mainnet.base.org",
        });
        setPermStatus(status as PermStatus);
      }
    } catch {
      // silent
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

  // Only show if wallet connected, agent configured, manually active, permission active on-chain, and budget not exhausted
  if (!address || !config || !config.is_active) return null;
  if (permStatus && (!permStatus.isActive || permStatus.remainingSpend === 0n)) return null;

  const isExpired = permStatus ? permStatus.isExpired : new Date(config.permission_expires_at) < new Date();
  const isActive = config.is_active && !isExpired;
  const allowance = config.spend_permission_json?.permission?.allowance
    ? BigInt(config.spend_permission_json.permission.allowance)
    : BigInt(Math.round(config.daily_budget_usdc * 1_000_000));
  const spent = permStatus?.currentPeriod?.spend ?? 0n;
  const statusDot = isExpired ? "bg-red-400" : isActive ? "bg-[#a8ff78]" : "bg-yellow-400";

  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-2 bg-[#1c1c1c] hover:bg-[#2a2a2a] rounded-full pl-2 pr-4 py-2 transition-colors outline-none cursor-pointer">
        {/* Brain + Allign logo badge */}
        <div className="relative shrink-0 w-[34px] h-[34px]">
          <div className="w-[34px] h-[34px] rounded-full bg-white/10 flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-[16px] h-[16px] rounded bg-white/90 border-[2px] border-[#1c1c1c] flex items-center justify-center">
            <img src="/logo.svg" alt="Allign" className="w-2.5 h-2.5 invert" />
          </div>
        </div>
        <span className="text-sm text-white/60 font-medium">Agent</span>
        <span className={`w-2 h-2 rounded-full ml-0.5 ${statusDot} ${isActive ? "animate-pulse" : ""}`} />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-3"
      >
        {/* Header — mirrors AgentActivationCard */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative w-14 h-14 mb-1">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
              <Brain size={26} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded bg-white/90 border-[2.5px] border-[#1a1a1a] flex items-center justify-center">
              <img src="/logo.svg" alt="Allign" className="w-3.5 h-3.5 invert" />
            </div>
          </div>
          <p className="text-white font-semibold text-sm font-manrope">Allign Agent</p>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#a8ff78] animate-pulse" : isExpired ? "bg-red-400" : "bg-yellow-400"}`} />
            <p className="text-xs text-white/40">
              {isExpired ? "Permission expired" : isActive ? "Active" : "Paused"}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-[#252525] rounded-lg px-3 py-2.5">
            <p className="text-white/40 text-xs mb-1">Budget</p>
            <p className="text-white font-semibold text-sm">{fmtUsdc(allowance)}</p>
          </div>
          <div className="bg-[#252525] rounded-lg px-3 py-2.5">
            <p className="text-white/40 text-xs mb-1">Spent</p>
            <p className="text-white font-semibold text-sm">{fmtUsdc(spent)}</p>
          </div>
        </div>

        {!isExpired && (
          <button
            onClick={toggleAgent}
            disabled={toggling}
            className={`w-full mt-3 py-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
              isActive
                ? "bg-[#333] hover:bg-[#3a3a3a] text-white"
                : "bg-[#a8ff78]/20 hover:bg-[#a8ff78]/30 text-[#a8ff78]"
            }`}
          >
            {toggling ? <Loader2 size={11} className="animate-spin" /> : isActive ? <Pause size={11} /> : <Zap size={11} />}
            {isActive ? "Pause Agent" : "Resume Agent"}
          </button>
        )}

        {/* Expired warning */}
        {isExpired && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <AlertCircle size={13} className="text-red-400 shrink-0" />
            <p className="text-red-400 text-xs">Go to chat to reactivate the agent</p>
          </div>
        )}

<a href="/app/activity" className="flex items-center justify-center text-sm text-white/60 hover:text-white transition-colors group">
          <span className="flex items-center gap-1.5 border-b border-white/30 group-hover:border-white transition-colors leading-none pb-[2px]">
            View full activity
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </a>
      </PopoverContent>
    </Popover>
  );
}
