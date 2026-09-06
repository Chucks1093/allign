"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { X, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import type { Stock } from "@/lib/stocks/tokens";
import type { OzmiumQuoteResult } from "@/lib/stocks/ozmium";
import { USDC_ADDRESS, ERC20_ABI, USDC_DECIMALS } from "@/lib/0x/constants";

type Tab = "Buy" | "Sell";
type Status = "idle" | "signing" | "success" | "error";

const MIN_BUY = 0.3;
const MIN_SELL = 0.000001;

interface Props {
  stock: Stock;
  price: number;
  onClose: () => void;
  initialTab?: Tab;
  initialAmount?: string;
}

export default function BuyModal({ stock, price, onClose, initialTab = "Buy", initialAmount }: Props) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [input, setInput] = useState(initialAmount ?? "");
  const [quote, setQuote] = useState<OzmiumQuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isBuy = tab === "Buy";

  useEffect(() => {
    if (!address) return;
    const pc = createPublicClient({ chain: base, transport: http() });

    pc.readContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address] })
      .then((b) => setUsdcBalance(Number(b as bigint) / 10 ** USDC_DECIMALS))
      .catch(() => {});

    pc.readContract({ address: stock.contract, abi: ERC20_ABI, functionName: "balanceOf", args: [address] })
      .then((b) => setTokenBalance(Number(b as bigint) / 1e8))
      .catch(() => {});
  }, [address, stock.contract]);

  const fetchQuote = useCallback(async (amount: string) => {
    const parsed = parseFloat(amount);
    const min = isBuy ? MIN_BUY : MIN_SELL;
    if (!amount || parsed < min || !address) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    setQuoting(true);
    setQuoteError(null);
    try {
      const res = await fetch("/api/stocks/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sym: stock.tokenTicker,
          side: tab.toLowerCase(),
          amount,
          taker: address,
          slippageBps: 100,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quote failed");
      if (!data.advisory?.amountOut) throw new Error("No liquidity available");
      setQuote(data);
    } catch (e: any) {
      setQuote(null);
      setQuoteError(e?.message ?? "Could not get quote");
    } finally {
      setQuoting(false);
    }
  }, [stock.tokenTicker, tab, isBuy, address]);

  useEffect(() => {
    const t = setTimeout(() => fetchQuote(input), 700);
    return () => clearTimeout(t);
  }, [input, fetchQuote]);

  async function handleTrade() {
    if (!address || !walletClient || !quote) return;
    setStatus("signing");
    setErrorMsg(null);
    setTxHashes([]);
    try {
      const publicClient = createPublicClient({ chain: base, transport: http() });

      const hashes: string[] = [];
      for (const step of quote.steps) {
        const hash = await walletClient.sendTransaction({
          to: step.to,
          data: step.data,
          value: BigInt(step.value),
          account: address,
          chain: base,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        hashes.push(hash);
        setTxHashes([...hashes]);
      }
      setStatus("success");
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.shortMessage ?? e?.message ?? "Transaction failed");
    }
  }

  const parsedInput = parseFloat(input) || 0;
  const advisory = quote?.advisory;
  const vsFeedBad = advisory && Math.abs(advisory.vsFeedPct) > 2;

  const belowMinimum = parsedInput > 0 && parsedInput < (isBuy ? MIN_BUY : MIN_SELL);
  const insufficientBalance = isBuy ? parsedInput > usdcBalance : parsedInput > tokenBalance;

  const canTrade =
    !!address && !!walletClient && !!quote && !quoting && !belowMinimum &&
    !insufficientBalance && !vsFeedBad && status === "idle";

  const receiveDisplay = () => {
    if (quoting) return <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Fetching…</span>;
    if (!advisory) return <span>≈ 0 {isBuy ? stock.tokenTicker : "USDC"}</span>;
    if (isBuy) return <span className="text-white/60 font-medium">≈ {(Number(advisory.amountOut) / 1e8).toFixed(6)} {stock.tokenTicker}</span>;
    return <span className="text-white/60 font-medium">≈ ${(Number(advisory.amountOut) / 1e6).toFixed(4)} USDC</span>;
  };

  const minReceivedDisplay = () => {
    if (!advisory) return null;
    if (isBuy) return `${(Number(advisory.amountOutMin) / 1e8).toFixed(6)} ${stock.tokenTicker}`;
    return `$${(Number(advisory.amountOutMin) / 1e6).toFixed(4)} USDC`;
  };

  const buttonLabel = () => {
    if (status === "signing") return <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Signing…</span>;
    if (insufficientBalance) return isBuy ? "Insufficient USDC balance" : `Insufficient ${stock.tokenTicker} balance`;
    if (belowMinimum) return isBuy ? "Minimum $0.30 USDC" : "Amount too small";
    if (!address) return "Connect wallet";
    if (quoting) return "Getting quote…";
    return isBuy ? `Buy ${stock.ticker}` : `Sell ${stock.ticker}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-3xl p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors cursor-pointer">
          <X size={18} />
        </button>

        <div className="flex items-center gap-1 bg-[#111] rounded-xl p-1 mb-5">
          {(["Buy", "Sell"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setQuote(null); setInput(""); setStatus("idle"); setErrorMsg(null); }}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                tab === t ? "bg-white text-black" : "text-white/40 hover:text-white/70"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xl">
            {stock.logo}
          </div>
          <div>
            <p className="text-white font-semibold">
              {stock.name} <span className="text-white/40 font-normal text-sm">({stock.ticker})</span>
            </p>
            <p className="text-white/40 text-xs">
              ${price.toLocaleString("en-US", { minimumFractionDigits: 2 })} per token · Base
            </p>
          </div>
        </div>

        <div className="bg-[#111] rounded-2xl p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/40 text-xs">{isBuy ? "You pay" : "You sell"}</span>
            <button
              onClick={() => setInput(isBuy ? usdcBalance.toFixed(2) : tokenBalance.toFixed(8))}
              className="text-xs text-white/50 hover:text-white font-medium transition-colors cursor-pointer bg-white/5 px-2 py-0.5 rounded-md"
            >
              MAX
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isBuy && <span className="text-white/30 text-2xl font-light">$</span>}
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-white text-3xl font-semibold outline-none placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-white/40 text-sm font-medium">{isBuy ? "USDC" : stock.tokenTicker}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/30">
            <span>You receive</span>
            {receiveDisplay()}
          </div>
        </div>

        {advisory && (
          <div className="bg-[#111] rounded-2xl p-3 mb-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-white/40">
              <span>Price per share</span>
              <span className="text-white/60">${advisory.pricePerShare.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-white/40">
              <span>Feed price</span>
              <span className="text-white/60">${advisory.feedUsd.toFixed(4)}</span>
            </div>
            <div className={`flex justify-between ${vsFeedBad ? "text-red-400" : "text-white/40"}`}>
              <span className="flex items-center gap-1">vs feed {vsFeedBad && <AlertCircle size={10} />}</span>
              <span className={vsFeedBad ? "text-red-400" : "text-white/60"}>
                {advisory.vsFeedPct >= 0 ? "+" : ""}{advisory.vsFeedPct.toFixed(3)}%
              </span>
            </div>
            <div className="flex justify-between text-white/40">
              <span>Min received</span>
              <span className="text-white/60">{minReceivedDisplay()}</span>
            </div>
            <div className="flex justify-between text-white/40">
              <span>Pool liquidity</span>
              <span className="text-white/60">${advisory.pool.usdc.toLocaleString()} USDC</span>
            </div>
          </div>
        )}

        {quoteError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-3">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <p className="text-red-400 text-xs">{quoteError}</p>
          </div>
        )}

        {vsFeedBad && (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5 mb-3">
            <Info size={15} className="text-yellow-400 shrink-0" />
            <p className="text-yellow-400 text-xs">Price deviates {advisory?.vsFeedPct.toFixed(2)}% from feed. Trade blocked.</p>
          </div>
        )}

        {status === "success" && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <p className="text-emerald-400 text-xs font-medium">{isBuy ? "Buy" : "Sell"} successful!</p>
            </div>
            {txHashes.map((h, i) => (
              <a key={h} href={`https://basescan.org/tx/${h}`} target="_blank" rel="noopener noreferrer"
                className="block text-xs text-emerald-400/60 hover:text-emerald-400 underline mt-0.5">
                Step {i + 1}: {h.slice(0, 10)}… →
              </a>
            ))}
          </div>
        )}

        {status === "error" && errorMsg && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-3">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <p className="text-red-400 text-xs">{errorMsg}</p>
          </div>
        )}

        <button
          onClick={handleTrade}
          disabled={!canTrade}
          className={`w-full py-3.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
            insufficientBalance || belowMinimum
              ? "bg-red-500/20 text-red-400 cursor-not-allowed"
              : vsFeedBad
              ? "bg-yellow-500/20 text-yellow-400 cursor-not-allowed"
              : canTrade
              ? isBuy
                ? "bg-[#a8ff78] hover:bg-[#96f060] text-black"
                : "bg-red-500 hover:bg-red-400 text-white"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
        >
          {buttonLabel()}
        </button>

        <div className="mt-3 flex items-center justify-between text-xs text-white/30 px-1">
          <span>{isBuy ? "USDC balance" : `${stock.tokenTicker} balance`}</span>
          <span>{isBuy ? `$${usdcBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC` : `${tokenBalance.toFixed(6)} ${stock.tokenTicker}`}</span>
        </div>
      </div>
    </div>
  );
}
