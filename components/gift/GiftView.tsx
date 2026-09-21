"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { Gift, Link2, Wallet } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import HandleTab from "./HandleTab";
import LinkTab from "./LinkTab";
import GiftTab from "./GiftTab";

interface Holding {
  ticker: string;
  name: string;
  logo: string;
  tokenTicker: string;
  shares: number;
  price: number;
  value: number;
  contract?: string;
}

export default function GiftView() {
  const { authenticated, login } = usePrivy();
  const { address } = useAccount();

  const [tab, setTab] = useState<"handle" | "link" | "gift">("gift");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [selected, setSelected] = useState<Holding | null>(null);
  const [stockContracts, setStockContracts] = useState<Record<string, string>>({});

  const fetchHoldings = useCallback(async () => {
    if (!address) { if (!authenticated) setLoadingHoldings(false); return; }
    try {
      const res = await fetch(`/api/portfolio?address=${address}`);
      const json = await res.json();
      setHoldings(json.holdings ?? []);
      if (json.holdings?.length > 0) setSelected(json.holdings[0]);
    } catch {
      setHoldings([]);
    } finally {
      setLoadingHoldings(false);
    }
  }, [address, authenticated]);

  useEffect(() => { fetchHoldings(); }, [fetchHoldings]);

  useEffect(() => {
    import("@/lib/stocks/tokens").then(({ STOCKS }) => {
      const map: Record<string, string> = {};
      STOCKS.forEach((s) => { map[s.tokenTicker] = s.contract; });
      setStockContracts(map);
    });
  }, []);

  // ── No wallet ────────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8 space-y-6 max-w-xl mx-auto">
        {/* Tab shell */}
        <div className="flex w-fit bg-[#111] rounded-xl p-1 mx-auto gap-1">
          {["Sticker", "Handle", "Link"].map((label) => (
            <div key={label} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white/20">{label}</div>
          ))}
        </div>
        {/* Connect state */}
        <div className="rounded-xl border border-white/[0.06] bg-[#181818] flex flex-col items-center justify-center gap-4 py-16">
          <Wallet size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">Connect your wallet to send gifts</p>
          <button onClick={login}
            className="flex items-center gap-2 px-6 py-1.5 rounded-lg bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors cursor-pointer">
            <Wallet size={15} /> Connect wallet
          </button>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────────
  if (loadingHoldings) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8 space-y-6 max-w-xl mx-auto">
        {/* Tab skeleton */}
        <div className="flex w-fit bg-[#111] rounded-xl p-1 mx-auto gap-1">
          {[80, 64, 72].map((w, i) => (
            <div key={i} className={`h-10 rounded-lg bg-white/5 animate-pulse`} style={{ width: w }} />
          ))}
        </div>
        {/* Sticker grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl aspect-square bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="px-4 md:px-8 py-6 md:py-8 space-y-6">

        {/* Tab switcher */}
        <div className="flex w-fit bg-[#111] rounded-xl p-1 mx-auto">
          {([
            { key: "handle", icon: <span className="text-sm font-bold leading-none">@</span>, label: "Handle" },
            { key: "link",   icon: <Link2 size={14} />, label: "Link" },
            { key: "gift",   icon: <Gift size={14} />, label: "Gift" },
          ] as const).map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 md:px-8 md:py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                tab === key ? "bg-[#2a2a2a] text-white" : "text-white/30 hover:text-white/50"
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>

        {tab === "handle" && (
          <HandleTab
            address={address!}
            holdings={holdings}
            selected={selected}
            setSelected={setSelected}
            stockContracts={stockContracts}
          />
        )}

        {tab === "link" && (
          <LinkTab
            address={address!}
            holdings={holdings}
            selected={selected}
            setSelected={setSelected}
            stockContracts={stockContracts}
          />
        )}

        {tab === "gift" && (
          <GiftTab
            address={address!}
            holdings={holdings}
            selected={selected}
            setSelected={setSelected}
            stockContracts={stockContracts}
            onSuccess={fetchHoldings}
          />
        )}

      </div>
    </ScrollArea>
  );
}
