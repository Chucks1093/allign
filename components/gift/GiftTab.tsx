"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, useAnimation } from "framer-motion";
import { X, Loader2, Copy, Check, Zap, CalendarDays } from "lucide-react";
import { useWalletClient } from "wagmi";
import { depositGift } from "@/lib/gifts/deposit";
import { FormInput } from "@/components/ui/form-input";
import StockAmountInput from "./StockAmountInput";

export const GIFT_STICKERS: Record<number, string> = {
   1: "/icons/sticker1.svg",
   2: "/icons/sticker2.svg",
   3: "/icons/sticker3.svg",
   4: "/icons/sticker4.svg",
   5: "https://img.icons8.com/stickers/300/birthday-cake.png",
   6: "https://img.icons8.com/stickers/300/confetti.png",
   7: "https://img.icons8.com/stickers/300/hearts.png",
   8: "https://img.icons8.com/stickers/300/rocket.png",
   9: "https://img.icons8.com/stickers/300/graduation-cap.png",
   10: "https://img.icons8.com/stickers/300/trophy.png",
   11: "https://img.icons8.com/stickers/300/money-bag.png",
   13: "https://img.icons8.com/?size=600&id=BbZPlr1iBhCQ&format=png",
   14: "https://img.icons8.com/stickers/300/fire-element.png",
   15: "https://img.icons8.com/stickers/300/diamond.png",
   16: "https://img.icons8.com/stickers/300/star.png",
   17: "https://img.icons8.com/stickers/300/champagne.png",
};

const CARD_COLORS = [
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#2a2a2a",
   "#E0D6FF",
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

export default function GiftTab({
   address,
   holdings,
   selected,
   setSelected,
   stockContracts,
   onSuccess,
}: Props) {
   const { data: walletClient } = useWalletClient({ chainId: 8453 });

   const [activeId, setActiveId] = useState<number | null>(null);
   const stickerAnim = useAnimation();

   useEffect(() => {
      if (activeId === null) return;
      let cancelled = false;
      let timeout: ReturnType<typeof setTimeout>;
      let interval: ReturnType<typeof setInterval>;

      function startFloat() {
         if (cancelled) return;
         stickerAnim.start(
            { y: [0, -7, 0] },
            { repeat: Infinity, duration: 3, ease: "easeInOut" },
         );
      }

      async function wiggle() {
         if (cancelled) return;
         await stickerAnim.start(
            { scale: [1, 1.18, 1.14, 1.14, 1], rotate: [6, 0, 0, 0, 6], y: 0 },
            { duration: 2.2, ease: "easeInOut", times: [0, 0.09, 0.18, 0.91, 1] },
         );
         startFloat();
      }

      async function run() {
         stickerAnim.stop();
         stickerAnim.set({ scale: 0, rotate: 0, opacity: 0, y: 0 });
         await stickerAnim.start(
            { scale: [0, 1.2, 1], rotate: [0, 12, 6], opacity: 1 },
            { duration: 0.4, ease: "easeOut", times: [0, 0.55, 1] },
         );
         if (cancelled) return;
         startFloat();
         timeout = setTimeout(() => {
            if (cancelled) return;
            wiggle();
            interval = setInterval(() => { wiggle(); }, 10200);
         }, 8000);
      }

      run();
      return () => { cancelled = true; clearTimeout(timeout); clearInterval(interval); };
   }, [activeId]);
   const [activeColor, setActiveColor] = useState("");

   const [message, setMessage] = useState("");
   const [amount, setAmount] = useState("");
   const [scheduleEnabled, setScheduleEnabled] = useState(false);
   const [scheduleDate, setScheduleDate] = useState("");

   const [sending, setSending] = useState(false);
   const [statusMsg, setStatusMsg] = useState("");
   const [claimLink, setClaimLink] = useState<string | null>(null);
   const [error, setError] = useState<string | null>(null);
   const [copied, setCopied] = useState(false);

   const parsedAmount = parseFloat(amount) || 0;
   const amountValid =
      parsedAmount > 0 && parsedAmount <= (selected?.shares ?? 0) + 1e-6;
   const canSend =
      !!activeId &&
      !!selected &&
      amountValid &&
      !!walletClient &&
      !sending &&
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
   }

   function closeModal() {
      setActiveId(null);
      setClaimLink(null);
   }

   async function handleSend() {
      if (!canSend || !activeId || !selected || !walletClient) return;
      const contract = stockContracts[selected.tokenTicker];
      if (!contract) {
         setError("Contract not found for this stock");
         return;
      }

      let releaseAt = 0n;
      if (scheduleEnabled && scheduleDate) {
         releaseAt = BigInt(
            Math.floor(new Date(scheduleDate).getTime() / 1000),
         );
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
               scheduled_at:
                  scheduleEnabled && scheduleDate
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
      .toISOString()
      .slice(0, 16);

   return (
      <div className="max-w-xl mx-auto">
         {/* Sticker grid */}
         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(GIFT_STICKERS).map(([idStr, url], i) => {
               const id = Number(idStr);
               const color = CARD_COLORS[i % CARD_COLORS.length];
               return (
                  <button
                     key={id}
                     onClick={() => openModal(id, color)}
                     className="rounded-2xl p-4 flex items-center justify-center cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-transform aspect-square bg-[#161616] border border-white/[0.06] hover:border-white/[0.12] shadow-sm"
                  >
                     <img
                        src={url}
                        alt=""
                        width={100}
                        height={100}
                        className="w-24 h-24 object-contain"
                     />
                  </button>
               );
            })}
         </div>

         {/* Modal */}
         {activeId !== null && (
            <div
               className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-0 sm:px-4"
               onClick={(e) => {
                  if (e.target === e.currentTarget) closeModal();
               }}
            >
               <div
                  className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                  onClick={closeModal}
               />

               <div className="relative w-full sm:max-w-sm bg-[#111] border border-white/[0.08] sm:rounded-2xl rounded-t-2xl shadow-2xl z-10 max-h-[92dvh] overflow-y-auto font-manrope">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4">
                     <p className="text-white font-semibold text-base">Send a gift</p>
                     <button
                        onClick={closeModal}
                        className="rounded-full w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer outline-none"
                     >
                        <X size={15} />
                     </button>
                  </div>

                  <div className="px-5 pb-6 space-y-4">
                     {claimLink ? (
                        /* Success state */
                        <div className="space-y-4 py-2">
                           <div className="flex flex-col items-center gap-4 py-4">
                              <img
                                 src={GIFT_STICKERS[activeId]}
                                 alt=""
                                 className="w-20 h-20 object-contain"
                              />
                              <div className="text-center">
                                 <p className="text-white font-bold text-xl">
                                    Gift created!
                                 </p>
                                 <p className="text-white/40 text-sm mt-1">
                                    Share this link to let them claim it
                                 </p>
                              </div>
                           </div>
                           <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                              <p className="flex-1 text-white/60 text-sm truncate">
                                 {claimLink}
                              </p>
                              <button
                                 onClick={copy}
                                 className="shrink-0 text-white/40 hover:text-white transition-colors cursor-pointer"
                              >
                                 {copied ? (
                                    <Check
                                       size={16}
                                       className="text-emerald-400"
                                    />
                                 ) : (
                                    <Copy size={16} />
                                 )}
                              </button>
                           </div>
                           <button
                              onClick={closeModal}
                              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors cursor-pointer"
                           >
                              Done
                           </button>
                        </div>
                     ) : (
                        <>
                           {/* Sticker preview */}
                           <div className="flex justify-center py-2">
                              <motion.img
                                 src={GIFT_STICKERS[activeId]}
                                 alt=""
                                 className="w-36 h-36 object-contain drop-shadow-xl"
                                 animate={stickerAnim}
                              />
                           </div>

                           {/* Message */}
                           <FormInput
                              label="Message (optional)"
                              value={message}
                              onChange={setMessage}
                              placeholder="Write something nice…"
                              type="textarea"
                              rows={2}
                           />

                           {/* Stock + Amount */}
                           <StockAmountInput
                              holdings={holdings}
                              selected={selected}
                              onSelect={(h) => {
                                 setSelected(h);
                                 setAmount("");
                              }}
                              tokenAmount={amount}
                              onTokenAmountChange={setAmount}
                           />

                           {/* Schedule */}
                           <div className="space-y-2">
                              <p className="text-[11px] font-mono uppercase tracking-widest text-white/70">
                                 When to unlock
                              </p>
                              <div className="flex gap-2">
                                 <button
                                    onClick={() => setScheduleEnabled(false)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer ${
                                       !scheduleEnabled
                                          ? "border-white/40 bg-white/5"
                                          : "border-white/10 bg-transparent hover:border-white/20"
                                    }`}
                                 >
                                    <Zap size={18} className={!scheduleEnabled ? "text-white shrink-0" : "text-white/30 shrink-0"} />
                                    <span className={`text-sm font-semibold ${!scheduleEnabled ? "text-white" : "text-white/40"}`}>Now</span>
                                 </button>
                                 <button
                                    onClick={() => setScheduleEnabled(true)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer ${
                                       scheduleEnabled
                                          ? "border-white/40 bg-white/5"
                                          : "border-white/10 bg-transparent hover:border-white/20"
                                    }`}
                                 >
                                    <CalendarDays size={18} className={scheduleEnabled ? "text-white shrink-0" : "text-white/30 shrink-0"} />
                                    <span className={`text-sm font-semibold ${scheduleEnabled ? "text-white" : "text-white/40"}`}>Schedule</span>
                                 </button>
                              </div>
                              {scheduleEnabled && (
                                 <div className="flex flex-col gap-1.5">
                                    <div className="relative flex items-center w-full border bg-[#0c0c0c] rounded-sm border-[#2a2a2a] focus-within:border-white/30 focus-within:ring-2 focus-within:ring-white/10 transition-colors">
                                       <input
                                          type="datetime-local"
                                          value={scheduleDate}
                                          min={minDatetime}
                                          onChange={(e) =>
                                             setScheduleDate(e.target.value)
                                          }
                                          className="flex-1 bg-transparent text-sm text-white px-4 py-4 outline-none [color-scheme:dark]"
                                       />
                                    </div>
                                 </div>
                              )}
                           </div>

                           {error && (
                              <p className="text-red-400 text-xs px-1">
                                 {error}
                              </p>
                           )}

                           <button
                              onClick={handleSend}
                              disabled={!canSend}
                              className="w-full py-4 rounded-xl bg-white/90 hover:bg-white text-black font-bold text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                           >
                              {sending ? (
                                 <>
                                    <Loader2
                                       size={15}
                                       className="animate-spin"
                                    />{" "}
                                    {statusMsg || "Processing…"}
                                 </>
                              ) : scheduleEnabled ? (
                                 "Schedule gift"
                              ) : (
                                 "Send gift"
                              )}
                           </button>
                        </>
                     )}
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
