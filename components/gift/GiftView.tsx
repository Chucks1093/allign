"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, createPublicClient, custom, http, isAddress } from "viem";
import { base } from "viem/chains";
import { Gift, Loader2, CheckCircle2, AlertCircle, ArrowRight, ChevronDown } from "lucide-react";

const TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

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

type Status = "idle" | "sending" | "success" | "error";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function GiftView() {
  const { wallets } = useWallets();
  const evmWallet = wallets.find((w) => w.walletClientType !== "solana");

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [selected, setSelected] = useState<Holding | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchHoldings = useCallback(async () => {
    if (!evmWallet) { setLoadingHoldings(false); return; }
    try {
      const res = await fetch(`/api/portfolio?address=${evmWallet.address}`);
      const json = await res.json();
      setHoldings(json.holdings ?? []);
      if (json.holdings?.length > 0) setSelected(json.holdings[0]);
    } catch {
      setHoldings([]);
    } finally {
      setLoadingHoldings(false);
    }
  }, [evmWallet]);

  useEffect(() => { fetchHoldings(); }, [fetchHoldings]);

  // Also need contract address — fetch from STOCKS
  const [stockContracts, setStockContracts] = useState<Record<string, string>>({});
  useEffect(() => {
    import("@/lib/stocks/tokens").then(({ STOCKS }) => {
      const map: Record<string, string> = {};
      STOCKS.forEach((s) => { map[s.tokenTicker] = s.contract; });
      setStockContracts(map);
    });
  }, []);

  const parsedAmount = parseFloat(amount) || 0;
  const recipientValid = isAddress(recipient);
  const amountValid = parsedAmount > 0 && parsedAmount <= (selected?.shares ?? 0);
  const usdValue = parsedAmount * (selected?.price ?? 0);

  const canSend =
    !!evmWallet && !!selected && recipientValid && amountValid && status === "idle";

  async function handleSend() {
    if (!canSend || !evmWallet || !selected) return;
    const contractAddr = stockContracts[selected.tokenTicker];
    if (!contractAddr) { setErrorMsg("Contract not found"); return; }

    setStatus("sending");
    setErrorMsg(null);
    setTxHash(null);
    try {
      const provider = await evmWallet.getEthereumProvider();
      const walletClient = createWalletClient({ chain: base, transport: custom(provider) });
      const publicClient = createPublicClient({ chain: base, transport: http() });
      const [account] = await walletClient.getAddresses();

      const rawAmount = BigInt(Math.round(parsedAmount * 1e8));
      const hash = await walletClient.writeContract({
        address: contractAddr as `0x${string}`,
        abi: TRANSFER_ABI,
        functionName: "transfer",
        args: [recipient as `0x${string}`, rawAmount],
        account,
        chain: base,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setStatus("success");
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.shortMessage ?? e?.message ?? "Transaction failed");
    }
  }

  function reset() {
    setStatus("idle");
    setTxHash(null);
    setErrorMsg(null);
    setAmount("");
    setRecipient("");
    fetchHoldings();
  }

  if (!evmWallet) {
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

  if (holdings.length === 0) {
    return (
      <div className="px-6 py-20 flex flex-col items-center gap-3 text-center">
        <Gift size={40} className="text-white/20" />
        <p className="text-white/40 text-sm">You need to own tokenized stocks before gifting</p>
        <a href="/explore" className="text-sm text-white/60 hover:text-white underline underline-offset-4 transition-colors">
          Browse stocks →
        </a>
      </div>
    );
  }

  if (status === "success" && txHash) {
    return (
      <div className="px-6 py-12 flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-white font-semibold text-lg">Gift Sent!</p>
          <p className="text-white/40 text-sm mt-1">
            {parsedAmount} {selected?.tokenTicker} sent to {shortAddr(recipient)}
          </p>
        </div>
        <a
          href={`https://basescan.org/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-emerald-400/70 hover:text-emerald-400 underline underline-offset-4 transition-colors"
        >
          View on Basescan →
        </a>
        <button
          onClick={reset}
          className="mt-2 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors cursor-pointer"
        >
          Send another gift
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 pb-10 space-y-4">

      {/* Stock picker */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Stock to gift</p>
        <div className="relative">
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-4 flex items-center gap-3 hover:border-white/20 transition-colors cursor-pointer"
          >
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
                <button
                  key={h.ticker}
                  onClick={() => { setSelected(h); setShowPicker(false); setAmount(""); }}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer ${selected?.ticker === h.ticker ? "bg-white/5" : ""}`}
                >
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

      {/* Recipient address */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Recipient wallet</p>
        <div className={`bg-[#1a1a1a] border rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors ${
          recipient && !recipientValid ? "border-red-500/40" : "border-white/10 focus-within:border-white/30"
        }`}>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
            placeholder="0x... wallet address"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25"
          />
          {recipientValid && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
        </div>
        {recipient && !recipientValid && (
          <p className="text-xs text-red-400 px-1">Enter a valid Ethereum address</p>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Amount of shares</p>
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-4 focus-within:border-white/30 transition-colors">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-white text-3xl font-semibold outline-none placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setAmount(selected?.shares.toFixed(8) ?? "")}
                className="text-xs text-white/50 hover:text-white font-medium transition-colors bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-md cursor-pointer"
              >
                MAX
              </button>
              <span className="text-white/40 text-sm">{selected?.tokenTicker}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/30">
            <span>≈ value</span>
            <span className="text-white/50">${usdValue.toFixed(2)} USD</span>
          </div>
        </div>
        {parsedAmount > (selected?.shares ?? 0) && parsedAmount > 0 && (
          <p className="text-xs text-red-400 px-1">Exceeds your balance of {selected?.shares.toFixed(6)} {selected?.tokenTicker}</p>
        )}
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

      {/* Error */}
      {status === "error" && errorMsg && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
          <AlertCircle size={15} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-xs">{errorMsg}</p>
        </div>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!canSend}
        className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
          canSend
            ? "bg-[#a8ff78] hover:bg-[#96f060] text-black"
            : "bg-white/5 text-white/20 cursor-not-allowed"
        }`}
      >
        {status === "sending" ? (
          <><Loader2 size={15} className="animate-spin" /> Sending…</>
        ) : (
          <><Gift size={15} /> Send Gift</>
        )}
      </button>

      <p className="text-center text-xs text-white/20">
        Transfers are irreversible — double-check the recipient address
      </p>
    </div>
  );
}
