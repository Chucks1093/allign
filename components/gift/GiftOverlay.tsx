"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { X, Wallet } from "lucide-react";
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

interface Props {
  onClose: () => void;
}

export default function GiftOverlay({ onClose }: Props) {
  const { authenticated, login } = usePrivy();
  const { address } = useAccount();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [selected, setSelected] = useState<Holding | null>(null);
  const [stockContracts, setStockContracts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchHoldings = useCallback(async () => {
    if (!address) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/portfolio?address=${address}`);
      const json = await res.json();
      setHoldings(json.holdings ?? []);
      if (json.holdings?.length > 0) setSelected(json.holdings[0]);
    } catch {
      setHoldings([]);
    } finally {
      setLoading(false);
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

  return (
    <>
      <div className="fixed inset-0 z-[89] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center pointer-events-none">
        <div className="relative bg-[#111] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl max-h-[90dvh] overflow-y-auto pointer-events-auto">

          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#111] z-10">
            <p className="text-white font-semibold font-manrope">Send a Gift</p>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="p-4">
            {!authenticated ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <Wallet size={36} className="text-white/20" />
                <p className="text-white/40 text-sm">Connect your wallet to send gifts</p>
                <button
                  onClick={login}
                  className="flex items-center gap-2 px-6 py-1.5 rounded-lg bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors cursor-pointer"
                >
                  <Wallet size={15} /> Connect wallet
                </button>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl aspect-square bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
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

        </div>
      </div>
    </>
  );
}
