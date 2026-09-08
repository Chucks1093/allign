"use client";

import { useState } from "react";
import Image from "next/image";
import { Gift, CheckCircle2, AlertCircle, ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { useWalletClient } from "wagmi";
import { createPublicClient, http, isAddress } from "viem";
import { base } from "viem/chains";

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

const CARD_COLORS = [
  "#E8D5FF", "#FFD6E8", "#FFF5A3", "#D6F0FF",
  "#FFE4CC", "#D6FFE8", "#F5D6FF", "#FFD6D6",
  "#D6EDFF", "#FFEFD6", "#E8FFD6", "#FFD6F5",
  "#D6FFF5", "#F5FFD6", "#FFD6E0", "#D6D6FF",
  "#FFF0D6", "#D6FFE0", "#FFD6EC", "#E0D6FF",
];

const GIFT_CARDS = [
  { id: 1,  sticker: "/icons/sticker1.svg" },
  { id: 2,  sticker: "/icons/sticker2.svg" },
  { id: 3,  sticker: "/icons/sticker3.svg" },
  { id: 4,  sticker: "/icons/sticker4.svg" },
  { id: 5,  sticker: "https://img.icons8.com/stickers/300/birthday-cake.png" },
  { id: 6,  sticker: "https://img.icons8.com/stickers/300/confetti.png" },
  { id: 7,  sticker: "https://img.icons8.com/stickers/300/hearts.png" },
  { id: 8,  sticker: "https://img.icons8.com/stickers/300/rocket.png" },
  { id: 9,  sticker: "https://img.icons8.com/stickers/300/graduation-cap.png" },
  { id: 10, sticker: "https://img.icons8.com/stickers/300/trophy.png" },
  { id: 11, sticker: "https://img.icons8.com/stickers/300/money-bag.png" },
  { id: 12, sticker: "https://img.icons8.com/stickers/300/party-popper.png" },
  { id: 13, sticker: "https://img.icons8.com/?size=600&id=BbZPlr1iBhCQ&format=png" },
  { id: 14, sticker: "https://img.icons8.com/stickers/300/fire-element.png" },
  { id: 15, sticker: "https://img.icons8.com/stickers/300/diamond.png" },
  { id: 16, sticker: "https://img.icons8.com/stickers/300/star.png" },
  { id: 17, sticker: "https://img.icons8.com/stickers/300/champagne.png" },
  { id: 18, sticker: "https://img.icons8.com/stickers/300/sunglasses.png" },
  { id: 19, sticker: "https://img.icons8.com/stickers/300/four-leaf-clover.png" },
  { id: 20, sticker: "https://img.icons8.com/stickers/300/teddy-bear.png" },
];

const TRANSFER_ABI = [{
  name: "transfer", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ name: "", type: "bool" }],
}] as const;

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

interface Props {
  address: string;
  holdings: Holding[];
  selected: Holding | null;
  setSelected: (h: Holding) => void;
  stockContracts: Record<string, string>;
  onSuccess: () => void;
}

export default function GiftTab({ address, holdings, selected, setSelected, stockContracts, onSuccess }: Props) {
  const { data: walletClient } = useWalletClient({ chainId: 8453 });
  const [showPicker, setShowPicker] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const parsedAmount = parseFloat(amount) || 0;
  const recipientValid = isAddress(recipient);
  const amountValid = parsedAmount > 0 && parsedAmount <= (selected?.shares ?? 0);
  const usdValue = parsedAmount * (selected?.price ?? 0);
  const canSend = !!address && !!walletClient && !!selected && recipientValid && amountValid && status === "idle";

  async function handleSend() {
    if (!canSend || !walletClient || !selected) return;
    const contractAddr = stockContracts[selected.tokenTicker];
    if (!contractAddr) { setErrorMsg("Contract not found"); return; }
    setStatus("sending"); setErrorMsg(null); setTxHash(null);
    try {
      const publicClient = createPublicClient({ chain: base, transport: http() });
      const rawAmount = BigInt(Math.round(parsedAmount * 1e8));
      const hash = await walletClient.writeContract({
        address: contractAddr as `0x${string}`,
        abi: TRANSFER_ABI,
        functionName: "transfer",
        args: [recipient as `0x${string}`, rawAmount],
        account: address as `0x${string}`,
        chain: base,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setStatus("success");
      onSuccess();
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.shortMessage ?? e?.message ?? "Transaction failed");
    }
  }

  if (status === "success" && txHash) {
    return (
      <div className="py-12 flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-white font-semibold text-lg">Gift Sent!</p>
          <p className="text-white/40 text-sm mt-1">{parsedAmount} {selected?.tokenTicker} sent to {shortAddr(recipient)}</p>
        </div>
        <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
          className="text-sm text-emerald-400/70 hover:text-emerald-400 underline underline-offset-4 transition-colors">
          View on Basescan →
        </a>
        <button onClick={() => { setStatus("idle"); setTxHash(null); setAmount(""); setRecipient(""); }}
          className="mt-2 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors cursor-pointer">
          Send another gift
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticker grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {GIFT_CARDS.map((card, i) => (
          <div key={card.id}
            style={{ backgroundColor: CARD_COLORS[i % CARD_COLORS.length] }}
            className="rounded-2xl p-4 flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform shadow-sm aspect-square"
          >
            <Image src={card.sticker} alt="" width={120} height={120} unoptimized />
          </div>
        ))}
      </div>

      {/* Stock picker */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Stock to gift</p>
        <div className="relative">
          <button onClick={() => setShowPicker((v) => !v)}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-4 flex items-center gap-3 hover:border-white/20 transition-colors cursor-pointer">
            <span className="text-2xl">{selected?.logo}</span>
            <div className="flex-1 text-left">
              <p className="text-white font-medium text-sm">{selected?.name}</p>
              <p className="text-white/40 text-xs">{selected?.shares.toFixed(6)} {selected?.tokenTicker} available</p>
            </div>
            <ChevronDown size={16} className={`text-white/40 transition-transform ${showPicker ? "rotate-180" : ""}`} />
          </button>
          {showPicker && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden z-10 shadow-2xl">
              {holdings.map((h) => (
                <button key={h.ticker}
                  onClick={() => { setSelected(h); setShowPicker(false); setAmount(""); }}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer ${selected?.ticker === h.ticker ? "bg-white/5" : ""}`}>
                  <span className="text-xl">{h.logo}</span>
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm font-medium">{h.name}</p>
                    <p className="text-white/40 text-xs">{h.shares.toFixed(6)} {h.tokenTicker}</p>
                  </div>
                  <p className="text-white/50 text-sm">${h.value.toFixed(2)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recipient */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Recipient wallet</p>
        <div className={`bg-[#1a1a1a] border rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors ${recipient && !recipientValid ? "border-red-500/40" : "border-white/10 focus-within:border-white/30"}`}>
          <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value.trim())}
            placeholder="0x... wallet address"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25" />
          {recipientValid && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
        </div>
        {recipient && !recipientValid && <p className="text-xs text-red-400 px-1">Enter a valid Ethereum address</p>}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Amount of shares</p>
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-4 focus-within:border-white/30 transition-colors">
          <div className="flex items-center gap-2">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
              className="flex-1 bg-transparent text-white text-3xl font-semibold outline-none placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setAmount(selected?.shares.toFixed(8) ?? "")}
                className="text-xs text-white/50 hover:text-white font-medium bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-md cursor-pointer">MAX</button>
              <span className="text-white/40 text-sm">{selected?.tokenTicker}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/30">
            <span>≈ value</span>
            <span className="text-white/50">${usdValue.toFixed(2)} USD</span>
          </div>
        </div>
        {parsedAmount > (selected?.shares ?? 0) && parsedAmount > 0 &&
          <p className="text-xs text-red-400 px-1">Exceeds your balance of {selected?.shares.toFixed(6)} {selected?.tokenTicker}</p>}
      </div>

      {/* Preview */}
      {selected && recipientValid && amountValid && (
        <div className="bg-[#111] border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">{selected.logo}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">{parsedAmount} {selected.tokenTicker}</p>
            <p className="text-white/40 text-xs">≈ ${usdValue.toFixed(2)}</p>
          </div>
          <ArrowRight size={14} className="text-white/30 shrink-0" />
          <div className="text-right shrink-0">
            <p className="text-white/60 text-sm font-mono">{shortAddr(recipient)}</p>
            <p className="text-white/30 text-xs">on Base</p>
          </div>
        </div>
      )}

      {status === "error" && errorMsg && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
          <AlertCircle size={15} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-xs">{errorMsg}</p>
        </div>
      )}

      <button onClick={handleSend} disabled={!canSend}
        className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${canSend ? "bg-[#a8ff78] hover:bg-[#96f060] text-black" : "bg-white/5 text-white/20 cursor-not-allowed"}`}>
        {status === "sending" ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Gift size={15} /> Send Gift</>}
      </button>

      <p className="text-center text-xs text-white/20">Transfers are irreversible — double-check the recipient address</p>
    </div>
  );
}
