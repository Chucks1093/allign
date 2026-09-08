"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { Gift, Link2, Loader2 } from "lucide-react";
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
  const { address } = useAccount();

  const [tab, setTab] = useState<"handle" | "link" | "gift">("gift");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [selected, setSelected] = useState<Holding | null>(null);
  const [stockContracts, setStockContracts] = useState<Record<string, string>>({});

  const fetchHoldings = useCallback(async () => {
    if (!address) { setLoadingHoldings(false); return; }
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
  }, [address]);

  useEffect(() => { fetchHoldings(); }, [fetchHoldings]);

  useEffect(() => {
    import("@/lib/stocks/tokens").then(({ STOCKS }) => {
      const map: Record<string, string> = {};
      STOCKS.forEach((s) => { map[s.tokenTicker] = s.contract; });
      setStockContracts(map);
    });
  }, []);

  if (!address) {
    return (
      <div className="px-6 py-20 flex flex-col items-center gap-3 text-center">
        <Gift size={40} className="text-white/20" />
        <p className="text-white/40 text-sm">Connect your wallet to send gifts</p>
      </div>
    );
  }

  if (loadingHoldings) {
    return (
      <div className="px-6 py-20 flex items-center justify-center">
        <Loader2 size={24} className="text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full bg-[#0d0d0d]">
      <div className="px-8 py-8 space-y-6">

        {/* Tab switcher */}
        <div className="flex items-center gap-3">
          {([
            { key: "handle", icon: <span className="text-sm font-bold">@</span>, label: "Handle" },
            { key: "link",   icon: <Link2 size={15} />, label: "Link" },
            { key: "gift",   icon: <Gift size={15} />, label: "Gift" },
          ] as const).map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                tab === key
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/40 hover:text-white/70"
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {tab === "handle" && (
          <HandleTab
            address={address}
            holdings={holdings}
            selected={selected}
            setSelected={setSelected}
            stockContracts={stockContracts}
          />
        )}

        {tab === "link" && (
          <LinkTab
            address={address}
            holdings={holdings}
            selected={selected}
            setSelected={setSelected}
            stockContracts={stockContracts}
          />
        )}

        {tab === "gift" && (
          <GiftTab
            address={address}
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
