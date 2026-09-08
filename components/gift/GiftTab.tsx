"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronDown, Loader2, Copy, Check, Zap, CalendarDays } from "lucide-react";
import { useWalletClient } from "wagmi";
import { depositGift } from "@/lib/gifts/deposit";

export const GIFT_STICKERS: Record<number, string> = {
  1:  "/icons/sticker1.svg",
  2:  "/icons/sticker2.svg",
  3:  "/icons/sticker3.svg",
  4:  "/icons/sticker4.svg",
  5:  "https://img.icons8.com/stickers/300/birthday-cake.png",
  6:  "https://img.icons8.com/stickers/300/confetti.png",
  7:  "https://img.icons8.com/stickers/300/hearts.png",
  8:  "https://img.icons8.com/stickers/300/rocket.png",
  9:  "https://img.icons8.com/stickers/300/graduation-cap.png",
  10: "https://img.icons8.com/stickers/300/trophy.png",
  11: "https://img.icons8.com/stickers/300/money-bag.png",
  12: "https://img.icons8.com/stickers/300/party-popper.png",
  13: "https://img.icons8.com/?size=600&id=BbZPlr1iBhCQ&format=png",
  14: "https://img.icons8.com/stickers/300/fire-element.png",
  15: "https://img.icons8.com/stickers/300/diamond.png",
  16: "https://img.icons8.com/stickers/300/star.png",
  17: "https://img.icons8.com/stickers/300/champagne.png",
  18: "https://img.icons8.com/stickers/300/sunglasses.png",
  19: "https://img.icons8.com/stickers/300/four-leaf-clover.png",
  20: "https://img.icons8.com/stickers/300/teddy-bear.png",
};

const CARD_COLORS = [
  "#E8D5FF", "#FFD6E8", "#FFF5A3", "#D6F0FF",
  "#FFE4CC", "#D6FFE8", "#F5D6FF", "#FFD6D6",
  "#D6EDFF", "#FFEFD6", "#E8FFD6", "#FFD6F5",
  "#D6FFF5", "#F5FFD6", "#FFD6E0", "#D6D6FF",
  "#FFF0D6", "#D6FFE0", "#FFD6EC", "#E0D6FF",
];

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
  address: string;
  holdings: Holding[];
  selected: Holding | null;
  setSelected: (h: Holding) => void;
  stockContracts: Record<string, string>;
  onSuccess: () => void;
}

export default function GiftTab({ address, holdings, selected, setSelected, stockContracts, onSuccess }: Props) {
  const { data: walletClient } = useWalletClient({ chainId: 8453 });

  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeColor, setActiveColor] = useState("");

  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [claimLink, setClaimLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const amountValid = parsedAmount > 0 && parsedAmount <= (selected?.shares ?? 0);
  const canSend = !!activeId && !!selected && amountValid && !!walletClient && !sending &&
    (!scheduleEnabled || !!scheduleDate);

  function openModal(id: number, color: string) {
    setActiveId(id);
    setActiveColor(color);
    setMessage("");
    setAmount("");
    setScheduleEnabled(false);
    setScheduleDate("");
    setError(null);
    setClaimLink(null);
    setShowPicker(false);
  }

  function closeModal() {
    setActiveId(null);
    setClaimLink(null);
  }

  async function handleSend() {
    if (!canSend || !activeId || !selected || !walletClient) return;
    const contract = stockContracts[selected.tokenTicker];
    if (!contract) { setError("Contract not found for this stock"); return; }

    let releaseAt = 0n;
    if (scheduleEnabled && scheduleDate) {
      releaseAt = BigInt(Math.floor(new Date(scheduleDate).getTime() / 1000));
    }

    setSending(true);
    setError(null);
    const giftId = crypto.randomUUID();

    try {
      const txHash = await depositGift({
        walletClient,
        address: address as `0x${string}`,
        giftId,
        tokenContract: contract as `0x${string}`,
        amount: parsedAmount,
        releaseAt,
        onStatus: setStatusMsg,
      });

      setStatusMsg("Saving gift…");
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: giftId,
          type: "sticker",
          sender_address: address,
          ticker: selected.tokenTicker,
          token_contract: contract,
          amount: parsedAmount,
          tx_hash: txHash,
          sticker_id: String(activeId),
          message: message.trim() || null,
          scheduled_at: scheduleEnabled && scheduleDate
            ? new Date(scheduleDate).toISOString()
            : null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setClaimLink(`${window.location.origin}/claim?id=${giftId}`);
      onSuccess();
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

  // Min datetime = 1 hour from now
  const minDatetime = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString().slice(0, 16);

  return (
    <>
      {/* Sticker grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(GIFT_STICKERS).map(([idStr, url], i) => {
          const id = Number(idStr);
          const color = CARD_COLORS[i % CARD_COLORS.length];
          return (
            <button
              key={id}
              onClick={() => openModal(id, color)}
              style={{ backgroundColor: color }}
              className="rounded-2xl p-4 flex items-center justify-center cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-transform shadow-sm aspect-square"
            >
              <img src={url} alt="" width={100} height={100} className="w-20 h-20 object-contain" />
            </button>
          );
        })}
      </div>

      {/* Modal */}
      {activeId !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative w-full sm:max-w-md bg-[#111] sm:rounded-2xl rounded-t-2xl shadow-2xl z-10 max-h-[92dvh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="text-white font-bold text-lg">Send a gift</p>
              <button onClick={closeModal} className="text-white/40 hover:text-white transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="px-5 pb-6 space-y-4">
              {claimLink ? (
                /* Success state */
                <div className="space-y-4 py-2">
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: activeColor }}>
                      <img src={GIFT_STICKERS[activeId]} alt="" className="w-14 h-14 object-contain" />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold text-xl">Gift created!</p>
                      <p className="text-white/40 text-sm mt-1">Share this link to let them claim it</p>
                    </div>
                  </div>
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                    <p className="flex-1 text-white/60 text-sm truncate">{claimLink}</p>
                    <button onClick={copy} className="shrink-0 text-white/40 hover:text-white transition-colors cursor-pointer">
                      {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <button onClick={closeModal}
                    className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors cursor-pointer">
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Sticker preview */}
                  <div className="flex justify-center pt-1">
                    <div className="w-24 h-24 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: activeColor }}>
                      <img src={GIFT_STICKERS[activeId]} alt="" className="w-16 h-16 object-contain" />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Message (optional)</p>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write something nice…"
                      rows={2}
                      maxLength={200}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-white/25 resize-none focus:border-white/30 transition-colors"
                    />
                  </div>

                  {/* Token selector */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Stock to gift</p>
                    <div className="relative">
                      <button onClick={() => setShowPicker((v) => !v)}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3.5 flex items-center gap-3 hover:border-white/20 transition-colors cursor-pointer">
                        <span className="text-xl">{selected?.logo}</span>
                        <div className="flex-1 text-left">
                          <p className="text-white font-bold text-sm">{selected?.tokenTicker}</p>
                          <p className="text-white/40 text-xs">{selected?.shares.toFixed(4)} available</p>
                        </div>
                        <ChevronDown size={15} className={`text-white/40 transition-transform ${showPicker ? "rotate-180" : ""}`} />
                      </button>
                      {showPicker && (
                        <div className="absolute top-full mt-1.5 left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden z-20 shadow-2xl">
                          {holdings.map((h) => (
                            <button key={h.ticker}
                              onClick={() => { setSelected(h); setShowPicker(false); setAmount(""); }}
                              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer ${selected?.ticker === h.ticker ? "bg-white/5" : ""}`}>
                              <span className="text-lg">{h.logo}</span>
                              <div className="flex-1 text-left">
                                <p className="text-white text-sm font-bold">{h.tokenTicker}</p>
                                <p className="text-white/40 text-xs">{h.name}</p>
                              </div>
                              <p className="text-white/40 text-xs">{h.shares.toFixed(4)}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Amount</p>
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3.5 focus-within:border-white/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0"
                          className="flex-1 bg-transparent text-white text-2xl font-bold outline-none placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => setAmount(selected?.shares.toFixed(8) ?? "")}
                            className="text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-md cursor-pointer transition-colors">
                            MAX
                          </button>
                          <span className="text-white/40 text-sm">{selected?.tokenTicker}</span>
                        </div>
                      </div>
                      {parsedAmount > 0 && selected && (
                        <p className="text-xs text-white/30 mt-1.5">≈ ${(parsedAmount * selected.price).toFixed(2)} USD</p>
                      )}
                    </div>
                    {parsedAmount > (selected?.shares ?? 0) && parsedAmount > 0 && (
                      <p className="text-xs text-red-400 px-1">Exceeds your balance</p>
                    )}
                  </div>

                  {/* Schedule */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">When to unlock</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setScheduleEnabled(false)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${!scheduleEnabled ? "bg-white text-black" : "bg-white/5 text-white/40 hover:text-white/70"}`}>
                        <Zap size={14} /> Now
                      </button>
                      <button
                        onClick={() => setScheduleEnabled(true)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${scheduleEnabled ? "bg-white text-black" : "bg-white/5 text-white/40 hover:text-white/70"}`}>
                        <CalendarDays size={14} /> Schedule
                      </button>
                    </div>
                    {scheduleEnabled && (
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        min={minDatetime}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors [color-scheme:dark]"
                      />
                    )}
                  </div>

                  {error && (
                    <p className="text-red-400 text-xs px-1">{error}</p>
                  )}

                  <button onClick={handleSend} disabled={!canSend}
                    className="w-full py-4 rounded-xl bg-[#a8ff78] hover:bg-[#96f060] text-black font-bold text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {sending
                      ? <><Loader2 size={15} className="animate-spin" /> {statusMsg || "Processing…"}</>
                      : scheduleEnabled ? "Schedule gift" : "Send gift"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
