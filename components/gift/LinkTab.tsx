"use client";

import { useState } from "react";
import { Link2, Loader2, Copy, Check, Wallet } from "lucide-react";
import { useWalletClient } from "wagmi";
import { depositGift } from "@/lib/gifts/deposit";
import { FormInput } from "@/components/ui/form-input";
import StockAmountInput from "./StockAmountInput";

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
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
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

    const giftId = crypto.randomUUID();

    try {
      const txHash = await depositGift({
        walletClient,
        address: address as `0x${string}`,
        giftId,
        tokenContract: contract as `0x${string}`,
        amount: parseFloat(amount),
        onStatus: setStatusMsg,
      });

      setStatusMsg("Saving gift…");
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: giftId,
          type: "link",
          sender_address: address,
          recipient_address: recipientAddress || null,
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
          <p className="text-white font-semibold text-xl">Link is ready</p>
          <p className="text-white/40 text-sm">Anyone with this link can claim the stocks.</p>
        </div>
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-4 flex items-center gap-3">
          <p className="flex-1 text-white/60 text-sm truncate">{claimLink}</p>
          <button onClick={copy} className="shrink-0 text-white/40 hover:text-white transition-colors cursor-pointer">
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>
        <button onClick={() => { setClaimLink(null); setAmount(""); setRecipientAddress(""); }}
          className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-base transition-colors cursor-pointer">
          Create another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 font-[var(--font-manrope)]">

      <FormInput
        label="Address"
        value={recipientAddress}
        onChange={setRecipientAddress}
        placeholder="0x..."
        prefix={<Wallet size={16} className="text-white/40 ml-4 shrink-0" />}
      />

      <StockAmountInput
        holdings={holdings}
        selected={selected}
        onSelect={setSelected}
        tokenAmount={amount}
        onTokenAmountChange={setAmount}
      />

      {error && <p className="text-red-400 text-xs px-1">{error}</p>}

      <button onClick={handleCreate} disabled={!canCreate}
        className="w-full py-4 rounded-xl bg-white/90 hover:bg-white text-black font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
        {sending ? <><Loader2 size={16} className="animate-spin" /> {statusMsg || "Processing…"}</> : <><Link2 size={18} /> Create the link</>}
      </button>
    </div>
  );
}
