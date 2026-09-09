"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSendCalls, useCallsStatus } from "wagmi";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { Loader2, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import type { Strategy } from "@/lib/stocks/strategies";
import { STOCKS } from "@/lib/stocks/tokens";
import { USDC_ADDRESS, ERC20_ABI, USDC_DECIMALS } from "@/lib/0x/constants";

type Tab = "Buy" | "Sell";
type Status = "idle" | "signing" | "success" | "error";

const MIN_BUY = 1;

interface Props {
  strategy: Strategy;
}

export default function StrategyTradeCard({ strategy }: Props) {
  const { address } = useAccount();
  const { sendCallsAsync } = useSendCalls();
  const [callsId, setCallsId] = useState<string | undefined>(undefined);
  const { data: callsStatus } = useCallsStatus({ id: callsId ?? "", query: { enabled: !!callsId } });

  const [tab, setTab] = useState<Tab>("Buy");
  const [input, setInput] = useState("");
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    const pc = createPublicClient({ chain: base, transport: http() });
    pc.readContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address] })
      .then((b) => setUsdcBalance(Number(b as bigint) / 10 ** USDC_DECIMALS))
      .catch(() => {});
  }, [address]);

  const fetchQuotes = useCallback(async (amount: string) => {
    const parsed = parseFloat(amount);
    if (!amount || parsed < MIN_BUY || !address) { setQuotes([]); setQuoteError(null); return; }
    setQuoting(true);
    setQuoteError(null);
    try {
      const results = await Promise.all(
        strategy.holdings.map(async (h) => {
          const alloc = (parsed * h.weight) / 100;
          const res = await fetch("/api/stocks/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sym: h.ticker, side: "buy", amount: alloc.toFixed(6), taker: address, slippageBps: 100 }),
          });
          const data = await res.json();
          if (!res.ok || !data.advisory?.amountOut) throw new Error(`No liquidity for ${h.ticker}`);
          return { ticker: h.ticker, weight: h.weight, alloc, quote: data };
        })
      );
      setQuotes(results);
    } catch (e: any) {
      setQuotes([]);
      setQuoteError(e?.message ?? "Could not get quotes");
    } finally {
      setQuoting(false);
    }
  }, [strategy, address]);

  useEffect(() => {
    const t = setTimeout(() => fetchQuotes(input), 700);
    return () => clearTimeout(t);
  }, [input, fetchQuotes]);

  async function handleTrade() {
    if (!address || !quotes.length) return;
    setStatus("signing");
    setErrorMsg(null);
    try {
      const allSteps = quotes.flatMap((q) =>
        q.quote.steps.map((step: any) => ({ to: step.to, data: step.data, value: BigInt(step.value) }))
      );
      const result = await sendCallsAsync({ calls: allSteps });
      setCallsId(result.id);
      setStatus("success");
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.shortMessage ?? e?.message ?? "Transaction failed");
    }
  }

  const parsedInput = parseFloat(input) || 0;
  const belowMinimum = parsedInput > 0 && parsedInput < MIN_BUY;
  const insufficientBalance = parsedInput > usdcBalance;
  const canTrade = !!address && quotes.length > 0 && !quoting && !belowMinimum && !insufficientBalance && status === "idle";

  const buttonLabel = () => {
    if (status === "signing") return <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Signing…</span>;
    if (insufficientBalance) return "Insufficient USDC";
    if (belowMinimum) return "Minimum $1.00 USDC";
    if (!address) return "Connect wallet";
    if (quoting) return "Getting quotes…";
    return `Buy ${strategy.holdings.length} stocks`;
  };

  const holdingStocks = strategy.holdings.map((h) => STOCKS.find((s) => s.tokenTicker === h.ticker));

  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-5 flex flex-col gap-4 relative">

      {/* Tab */}
      <div className="flex w-fit bg-white/5 rounded-lg p-0.5 mx-auto">
        {(["Buy", "Sell"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setQuotes([]); setInput(""); setStatus("idle"); setErrorMsg(null); }}
            className={`px-5 py-1.5 rounded-md text-sm font-semibold transition-all cursor-pointer ${
              tab === t ? "bg-white/15 text-white" : "text-white/30 hover:text-white/60"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Strategy info */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center">
          {holdingStocks.slice(0, 5).map((stock, i) =>
            stock ? (
              <img key={stock.tokenTicker} src={stock.logo} alt={stock.name} width={36} height={36}
                className="rounded-full bg-white p-0.5 border-2 border-[#1a1a1a]"
                style={{ marginLeft: i === 0 ? 0 : -10, zIndex: i }} />
            ) : null
          )}
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{strategy.name}</p>
          <p className="text-white/40 text-xs mt-0.5">{strategy.holdings.length} stocks</p>
        </div>
      </div>

      {tab === "Sell" ? (
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <Lock size={22} className="text-white/30" />
          <p className="text-white/40 text-xs text-center">Sell individual stocks<br />from the Composition table</p>
        </div>
      ) : (
        <>
          {/* Amount input */}
          <div className="bg-[#111] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/40 text-xs">You pay</span>
              <button onClick={() => setInput(usdcBalance.toFixed(2))}
                className="text-xs text-white/50 hover:text-white font-medium transition-colors cursor-pointer bg-white/5 px-2 py-0.5 rounded-md">
                MAX
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-2xl font-light">$</span>
              <input type="number" value={input} onChange={(e) => setInput(e.target.value)} placeholder="0"
                className="flex-1 bg-transparent text-white text-3xl font-semibold outline-none placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              <span className="text-white/40 text-sm font-medium">USDC</span>
            </div>
          </div>

          {/* Allocation breakdown */}
          {parsedInput >= MIN_BUY && (
            <div className="bg-[#111] rounded-2xl p-3 space-y-1.5">
              {strategy.holdings.map((h) => {
                const stock = STOCKS.find((s) => s.tokenTicker === h.ticker);
                const alloc = (parsedInput * h.weight) / 100;
                const q = quotes.find((r) => r.ticker === h.ticker);
                const received = q ? (Number(q.quote.advisory.amountOut) / 1e8).toFixed(6) : null;
                return (
                  <div key={h.ticker} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-white/50">
                      <img src={stock?.logo} alt={h.ticker} width={16} height={16} className="rounded-full bg-white" />
                      <span>{h.ticker}</span>
                      <span className="text-white/25">{h.weight}%</span>
                    </div>
                    <div className="text-right text-white/40">
                      <span className="text-white/60">${alloc.toFixed(2)}</span>
                      {quoting && <Loader2 size={9} className="animate-spin inline ml-1" />}
                      {received && <span className="text-white/30 ml-1">≈ {received} {h.ticker}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {quoteError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-xs">{quoteError}</p>
            </div>
          )}

          {status === "success" && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <p className="text-emerald-400 text-xs font-medium">Strategy bought!</p>
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

          <button onClick={handleTrade} disabled={!canTrade}
            className={`w-full py-3.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              insufficientBalance || belowMinimum
                ? "bg-red-500/20 text-red-400 cursor-not-allowed"
                : canTrade
                ? "bg-[#a8ff78] hover:bg-[#96f060] text-black"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}>
            {buttonLabel()}
          </button>

          <div className="flex items-center justify-between text-xs text-white/30 px-1">
            <span>USDC balance</span>
            <span>${usdcBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC</span>
          </div>
        </>
      )}
    </div>
  );
}
