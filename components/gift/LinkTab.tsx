"use client";

import { useState } from "react";
import { Link2, ChevronDown, Loader2, Copy, Check } from "lucide-react";
import { useWalletClient } from "wagmi";
import { depositGift } from "@/lib/gifts/deposit";

interface Holding {
  ticker: string;
  name: string;
  logo: string;
  tokenTicker: string;
  shares: number;
  price: number;
  value: number;
}

interface Props {
  address: string;
  holdings: Holding[];
  selected: Holding | null;
  setSelected: (h: Holding) => void;
  stockContracts: Record<string, string>;
}

export default function LinkTab({ address, holdings, selected, setSelected, stockContracts }: Props) {
  const [amount, setAmount] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const { data: walletClient } = useWalletClient({ chainId: 8453 });
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [claimLink, setClaimLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = !!selected && parseFloat(amount) > 0 && !sending && !!walletClient;

  async function handleCreate() {
    if (!canCreate || !selected || !walletClient) return;
    const contract = stockContracts[selected.tokenTicker];
    if (!contract) { setError("Contract not found for this stock"); return; }

    setSending(true);
    setError(null);

    // Generate UUID client-side — deposit on-chain first, save to DB after
    const giftId = crypto.randomUUID();

    try {
      // 1. Approve + deposit into escrow
      const txHash = await depositGift({
        walletClient,
        address: address as `0x${string}`,
        giftId,
        tokenContract: contract as `0x${string}`,
        amount: parseFloat(amount),
        onStatus: setStatusMsg,
      });

      // 2. Save to DB only after on-chain deposit succeeds
      setStatusMsg("Saving gift…");
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: giftId,
          type: "link",
          sender_address: address,
          ticker: selected.tokenTicker,
          token_contract: contract,
          amount: parseFloat(amount),
          tx_hash: txHash,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setClaimLink(`${window.location.origin}/claim?id=${giftId}`);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setSending(false);
      setStatusMsg("");
    }
  }

  function copy() {
    if (!claimLink) return;
    navigator.clipboard.writeText(claimLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (claimLink) {
    return (
      <div className="max-w-xl mx-auto space-y-6 font-[var(--font-manrope)]">
        <div className="space-y-1">
          <p className="text-white font-semibold text-xl">Link is ready</p>
          <p className="text-white/40 text-sm">Anyone with this link can claim the stocks.</p>
        </div>
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-4 flex items-center gap-3">
          <p className="flex-1 text-white/60 text-sm truncate">{claimLink}</p>
          <button onClick={copy} className="shrink-0 text-white/40 hover:text-white transition-colors cursor-pointer">
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>
        <button onClick={() => { setClaimLink(null); setAmount(""); }}
          className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-base transition-colors cursor-pointer">
          Create another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 font-[var(--font-manrope)]">
      <p className="text-white font-semibold text-xl">Stocks you can paste anywhere.</p>

      {/* Stock picker */}
      <div className="relative">
        <button onClick={() => setShowPicker((v) => !v)}
          className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-4 flex items-center gap-3 hover:border-white/20 transition-colors cursor-pointer">
          <span className="text-2xl">{selected?.logo}</span>
          <div className="flex-1 text-left">
            <span className="text-white font-bold text-sm mr-2">{selected?.tokenTicker}</span>
            <span className="text-white/40 text-sm">{selected?.name}</span>
          </div>
          <ChevronDown size={16} className={`text-white/40 transition-transform ${showPicker ? "rotate-180" : ""}`} />
        </button>
        {showPicker && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden z-10 shadow-2xl">
            {holdings.map((h) => (
              <button key={h.ticker} onClick={() => { setSelected(h); setShowPicker(false); }}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer ${selected?.ticker === h.ticker ? "bg-white/5" : ""}`}>
                <span className="text-xl">{h.logo}</span>
                <div className="flex-1 text-left">
                  <span className="text-white text-sm font-bold mr-2">{h.tokenTicker}</span>
                  <span className="text-white/40 text-sm">{h.name}</span>
                </div>
                <p className="text-white/50 text-sm">${h.value.toFixed(2)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Amount */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-5 py-4 space-y-2">
        <p className="text-white/40 text-sm">Amount</p>
        <input
          type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="w-full bg-transparent text-white text-4xl font-bold outline-none placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <div className="flex items-center justify-between pt-1">
          <span className="text-white/30 text-sm">
            ${selected && parseFloat(amount) > 0
              ? (parseFloat(amount) * (selected.price || 0)).toFixed(2)
              : "0.00"} ↕
          </span>
          <span className="text-white/30 text-sm">
            {parseFloat(amount) > 0 ? parseFloat(amount).toFixed(6) : "0"} {selected?.tokenTicker} ·{" "}
            <button onClick={() => setAmount(String(selected?.shares ?? ""))}
              className="text-white font-semibold hover:text-white/80 cursor-pointer transition-colors">
              Use max
            </button>
          </span>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs px-1">{error}</p>}

      <button onClick={handleCreate} disabled={!canCreate}
        className="w-full py-4 rounded-xl bg-white hover:bg-white/90 text-black font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
        {sending ? <><Loader2 size={16} className="animate-spin" /> {statusMsg || "Processing…"}</> : <><Link2 size={18} /> Create the link</>}
      </button>
    </div>
  );
}
