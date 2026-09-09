"use client";

import { useState } from "react";
import { Loader2, Copy, Check } from "lucide-react";
import { useWalletClient } from "wagmi";
import { depositGift } from "@/lib/gifts/deposit";
import StockAmountInput from "./StockAmountInput";
import { FormInput } from "@/components/ui/form-input";

interface Holding {
   ticker: string;
   name: string;
   logo: string;
   tokenTicker: string;
   shares: number;
   price: number;
   value: number;
}

const PLATFORMS = [
   {
      id: "twitter",
      label: "X / Twitter",
      icon: (
         <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
         </svg>
      ),
   },
   {
      id: "farcaster",
      label: "Farcaster",
      icon: (
         <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M18.24 0.24H5.76C2.5789 0.24 0 2.8188 0 6v12c0 3.1811 2.5789 5.76 5.76 5.76h12.48c3.1812 0 5.76-2.5789 5.76-5.76V6C24 2.8188 21.4212 0.24 18.24 0.24m0.8155 17.1662v0.504c0.2868-0.0256 0.5458 0.1905 0.5439 0.479v0.5688h-5.1437v-0.5688c-0.0019-0.2885 0.2576-0.5047 0.5443-0.479v-0.504c0-0.22 0.1525-0.402 0.358-0.458l-0.0095-4.3645c-0.1589-1.7366-1.6402-3.0979-3.4435-3.0979-1.8038 0-3.2846 1.3613-3.4435 3.0979l-0.0096 4.3578c0.2276 0.0424 0.5318 0.2083 0.5395 0.4648v0.504c0.2863-0.0256 0.5457 0.1905 0.5438 0.479v0.5688H4.3915v-0.5688c-0.0019-0.2885 0.2575-0.5047 0.5438-0.479v-0.504c0-0.2529 0.2011-0.4548 0.4536-0.4724v-7.895h-0.4905L4.2898 7.008l2.6405-0.0005V5.0419h9.9495v1.9656h2.8219l-0.6091 2.0314h-0.4901v7.8949c0.2519 0.0177 0.453 0.2195 0.453 0.4724" />
         </svg>
      ),
   },
   {
      id: "telegram",
      label: "Telegram",
      icon: (
         <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
         </svg>
      ),
   },
   {
      id: "discord",
      label: "Discord",
      icon: (
         <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
         </svg>
      ),
   },
];

interface Props {
   address: string;
   holdings: Holding[];
   selected: Holding | null;
   setSelected: (h: Holding) => void;
   stockContracts: Record<string, string>;
}

export default function HandleTab({
   address,
   holdings,
   selected,
   setSelected,
   stockContracts,
}: Props) {
   const [platform, setPlatform] = useState("twitter");
   const [handle, setHandle] = useState("");
   const [amount, setAmount] = useState("");
   const { data: walletClient } = useWalletClient({ chainId: 8453 });
   const [sending, setSending] = useState(false);
   const [statusMsg, setStatusMsg] = useState("");
   const [claimLink, setClaimLink] = useState<string | null>(null);
   const [copied, setCopied] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const canSend =
      !!handle &&
      !!selected &&
      parseFloat(amount) > 0 &&
      !sending &&
      !!walletClient;

   async function handleSend() {
      if (!canSend || !selected || !walletClient) return;
      const contract = stockContracts[selected.tokenTicker];
      if (!contract) {
         setError("Contract not found for this stock");
         return;
      }

      setSending(true);
      setError(null);

      // Generate UUID client-side so we can use it as the on-chain gift ID
      const giftId = crypto.randomUUID();

      try {
         // 1. Approve + deposit into escrow first — no DB record until tx confirmed
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
               type: "handle",
               sender_address: address,
               platform,
               recipient_handle: handle.replace(/^@/, ""),
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
         <div className="max-w-sm mx-auto space-y-6 font-[var(--font-manrope)]">
            <div className="space-y-1">
               <p className="text-white font-semibold text-xl">Gift created</p>
               <p className="text-white/40 text-sm">
                  Share this link with{" "}
                  <span className="text-white">@{handle}</span> — they'll claim
                  it at /claim.
               </p>
            </div>
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-4 flex items-center gap-3">
               <p className="flex-1 text-white/60 text-sm truncate">
                  {claimLink}
               </p>
               <button
                  onClick={copy}
                  className="shrink-0 text-white/40 hover:text-white transition-colors cursor-pointer"
               >
                  {copied ? (
                     <Check size={16} className="text-emerald-400" />
                  ) : (
                     <Copy size={16} />
                  )}
               </button>
            </div>
            <button
               onClick={() => {
                  setClaimLink(null);
                  setHandle("");
                  setAmount("");
               }}
               className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-base transition-colors cursor-pointer"
            >
               Send another
            </button>
         </div>
      );
   }

   return (
      <div className="max-w-lg mx-auto space-y-4 font-[var(--font-manrope)]">
         <p className="text-white font-semibold text-xl">Where do they post?</p>

         {/* Platform grid */}
         <div className="grid grid-cols-4 gap-1.5">
            {PLATFORMS.map((p) => (
               <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`rounded-sm py-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                     platform === p.id
                        ? "bg-[#2a2a2a] text-white ring-1 ring-white/30"
                        : "bg-[#1a1a1a] text-white/50 hover:text-white hover:bg-[#222]"
                  }`}
               >
                  {p.icon}
               </button>
            ))}
         </div>

         {/* Handle input */}
         <FormInput
            label="Handle"
            value={handle}
            onChange={setHandle}
            placeholder="ninamakes"
            prefix={<span className="text-white/60 text-lg font-semibold pl-4 pr-1">@</span>}
         />

         {/* Stock + Amount */}
         <StockAmountInput
            holdings={holdings}
            selected={selected}
            onSelect={setSelected}
            tokenAmount={amount}
            onTokenAmountChange={setAmount}
         />

         {error && <p className="text-red-400 text-xs px-1">{error}</p>}

         <button
            onClick={handleSend}
            disabled={!canSend}
            className="w-full py-4 rounded-xl bg-white/90 hover:bg-white text-black font-bold text-base transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
         >
            {sending ? (
               <>
                  <Loader2 size={16} className="animate-spin" />{" "}
                  {statusMsg || "Processing…"}
               </>
            ) : (
               "Send it"
            )}
         </button>
      </div>
   );
}
