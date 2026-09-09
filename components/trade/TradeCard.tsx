"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSendCalls, useCallsStatus } from "wagmi";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { Loader2, CheckCircle2, AlertCircle, Info, Lock } from "lucide-react";
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
}

export default function TradeCard({ stock, price }: Props) {
  const { address } = useAccount();
  const { sendCallsAsync } = useSendCalls();
  const [callsId, setCallsId] = useState<string | undefined>(undefined);
  const { data: callsStatus } = useCallsStatus({ id: callsId ?? "", query: { enabled: !!callsId } });
  const [tab, setTab] = useState<Tab>("Buy");
  const [input, setInput] = useState("");
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
    if (!amount || parsed < min || !address) { setQuote(null); setQuoteError(null); return; }
    setQuoting(true);
    setQuoteError(null);
    try {
      const res = await fetch("/api/stocks/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sym: stock.tokenTicker, side: tab.toLowerCase(), amount, taker: address, slippageBps: 100 }),
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
    if (!address || !quote) return;
    setStatus("signing");
    setErrorMsg(null);
    setTxHashes([]);
    try {
      const result = await sendCallsAsync({
        calls: quote.steps.map((step) => ({ to: step.to, data: step.data, value: BigInt(step.value) })),
      });
      setCallsId(result.id);
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
  const canTrade = !!address && !!quote && !quoting && !belowMinimum && !insufficientBalance && !vsFeedBad && status === "idle";

  const receiveDisplay = () => {
    if (quoting) return <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Fetching…</span>;
    if (!advisory) return <span>≈ 0 {isBuy ? stock.tokenTicker : "USDC"}</span>;
    if (isBuy) return <span className="text-white/60 font-medium">≈ {(Number(advisory.amountOut) / 1e8).toFixed(6)} {stock.tokenTicker}</span>;
    return <span className="text-white/60 font-medium">≈ ${(Number(advisory.amountOut) / 1e6).toFixed(4)} USDC</span>;
  };

  const buttonLabel = () => {
    if (status === "signing") return <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Signing…</span>;
    if (insufficientBalance) return isBuy ? "Insufficient USDC" : `Insufficient ${stock.tokenTicker}`;
    if (belowMinimum) return isBuy ? "Minimum $0.30 USDC" : "Amount too small";
    if (!address) return "Connect wallet";
    if (quoting) return "Getting quote…";
    return isBuy ? `Buy ${stock.ticker}` : `Sell ${stock.ticker}`;
  };

  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-5 flex flex-col gap-4 relative">
      {stock.tradable === false && (
        <div className="absolute inset-0 rounded-2xl bg-[#1a1a1a]/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Lock size={24} className="text-white/40" />
          </div>
          <div className="text-center">
            <p className="text-white/70 text-sm font-semibold">Trading not yet live</p>
            <p className="text-white/30 text-xs mt-1">Coming soon for {stock.ticker}</p>
          </div>
        </div>
      )}
      {/* Tab */}
      <div className="flex w-fit bg-white/5 rounded-lg p-0.5 mx-auto">
        {(["Buy", "Sell"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setQuote(null); setInput(""); setStatus("idle"); setErrorMsg(null); }}
            className={`px-5 py-1.5 rounded-md text-sm font-semibold transition-all cursor-pointer ${
              tab === t ? "bg-white/15 text-white" : "text-white/30 hover:text-white/60"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Stock info */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative shrink-0">
          <img src={stock.logo} alt={stock.name} width={48} height={48} className="rounded-full bg-white p-0.5" />
          <img src="/icons/base.svg" alt="Base" width={19} height={19} className="absolute -bottom-0.5 -right-0.5 rounded border-[2px] border-[#1a1a1a]" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{stock.name} <span className="text-white/40 font-normal">({stock.ticker})</span></p>
        </div>
      </div>

      {/* Amount input */}
      <div className="bg-[#111] rounded-2xl p-4">
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

      {/* Quote details */}
      {advisory && (
        <div className="bg-[#111] rounded-2xl p-3 space-y-1.5 text-xs">
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
            <span className="text-white/60">
              {isBuy ? `${(Number(advisory.amountOutMin) / 1e8).toFixed(6)} ${stock.tokenTicker}` : `$${(Number(advisory.amountOutMin) / 1e6).toFixed(4)} USDC`}
            </span>
          </div>
          <div className="flex justify-between text-white/40">
            <span>Pool liquidity</span>
            <span className="text-white/60">${advisory.pool.usdc.toLocaleString()} USDC</span>
          </div>
        </div>
      )}

      {quoteError && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
          <AlertCircle size={15} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-xs">{quoteError}</p>
        </div>
      )}

      {vsFeedBad && (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5">
          <Info size={15} className="text-yellow-400 shrink-0" />
          <p className="text-yellow-400 text-xs">Price deviates {advisory?.vsFeedPct.toFixed(2)}% from feed. Trade blocked.</p>
        </div>
      )}

      {status === "success" && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <p className="text-emerald-400 text-xs font-medium">{isBuy ? "Buy" : "Sell"} submitted!</p>
          </div>
          {callsStatus?.receipts?.map((r, i) => (
            <a key={i} href={`https://basescan.org/tx/${r.transactionHash}`} target="_blank" rel="noopener noreferrer"
              className="block text-xs text-emerald-400/60 hover:text-emerald-400 underline mt-0.5">
              View on Basescan →
            </a>
          ))}
        </div>
      )}

      {status === "error" && errorMsg && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
          <AlertCircle size={15} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-xs">{errorMsg}</p>
        </div>
      )}

      {/* Trade button */}
      <button
        onClick={handleTrade}
        disabled={!canTrade}
        className={`w-full py-3.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
          insufficientBalance || belowMinimum
            ? "bg-red-500/20 text-red-400 cursor-not-allowed"
            : vsFeedBad
            ? "bg-yellow-500/20 text-yellow-400 cursor-not-allowed"
            : canTrade
            ? isBuy ? "bg-[#a8ff78] hover:bg-[#96f060] text-black" : "bg-red-500 hover:bg-red-400 text-white"
            : "bg-white/10 text-white/30 cursor-not-allowed"
        }`}
      >
        {buttonLabel()}
      </button>

      <div className="flex items-center justify-between text-xs text-white/30 px-1">
        <span>{isBuy ? "USDC balance" : `${stock.tokenTicker} balance`}</span>
        <span>{isBuy ? `$${usdcBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC` : `${tokenBalance.toFixed(6)} ${stock.tokenTicker}`}</span>
      </div>
    </div>
  );
}
