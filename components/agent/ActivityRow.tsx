"use client";

import { ArrowDownLeft, ArrowUpRight, Minus, AlertCircle, Copy, Gift, Info } from "lucide-react";
import { STOCKS } from "@/lib/stocks/tokens";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BuyInfo {
  ticker: string;
  shares: number;
  amount_usdc: number;
  price: number;
  tx_hash: string;
  signal_score: number;
}

export interface SellInfo {
  ticker: string;
  shares: number;
  amount_usdc: number;
  price: number;
  tx_hash: string;
  signal_score: number;
}

export interface GiftInfo {
  ticker: string;
  shares: number;
  to_address: string;
  tx_hash: string;
}

export interface ErrorInfo {
  reason: string;
  ticker?: string;
}

export interface InfoInfo {
  body: string;
}

export type ActivityType = "buy" | "sell" | "gift" | "error" | "info";

export type Activity =
  | { id: string; type: "buy";   title: string; description: string; created_at: string; info: BuyInfo }
  | { id: string; type: "sell";  title: string; description: string; created_at: string; info: SellInfo }
  | { id: string; type: "gift";  title: string; description: string; created_at: string; info: GiftInfo }
  | { id: string; type: "error"; title: string; description: string; created_at: string; info: ErrorInfo }
  | { id: string; type: "info";  title: string; description: string; created_at: string; info: InfoInfo };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortAddr(addr: string) { return `${addr.slice(0, 6)}...${addr.slice(-4)}`; }
function shortHash(hash: string) { return `${hash.slice(0, 6)}...${hash.slice(-5)}`; }
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function formatDate(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return { date, time, full: `${date} ${time}` };
}

function CopyButton({ value }: { value: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(value); }}
      className="text-white/30 hover:text-white/60 transition-colors cursor-pointer"
    >
      <Copy size={13} />
    </button>
  );
}

function DetailRow({ label, value, mono, copyValue }: { label: string; value: string; mono?: boolean; copyValue?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
      <span className="text-white/40 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm text-white/80 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
        {copyValue && <CopyButton value={copyValue} />}
      </div>
    </div>
  );
}

function ViewTxButton({ hash }: { hash: string }) {
  return (
    <div className="px-5 pb-5 pt-2">
      <a
        href={`https://basescan.org/tx/${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-3.5 rounded-xl bg-white/8 hover:bg-white/12 text-white text-sm font-semibold text-center transition-colors"
      >
        View Transaction
      </a>
    </div>
  );
}

// ─── Modal components (one per type) ──────────────────────────────────────────

function BuyModal({ info }: { info: BuyInfo }) {
  const stock = STOCKS.find((s) => s.tokenTicker === info.ticker);
  const { full } = formatDate(new Date().toISOString()); // replaced by real date at row level
  return (
    <>
      <div className="flex flex-col items-center py-7 gap-1.5">
        <p className="text-4xl font-bold text-white">-${fmt(info.amount_usdc)}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {stock && <img src={stock.logo} alt={info.ticker} width={16} height={16} className="rounded-full bg-white p-px" />}
          <p className="text-white/40 text-sm">{info.shares.toFixed(6)} {info.ticker}</p>
        </div>
      </div>
      <div className="px-5 pb-2">
        <DetailRow label="Token" value={info.ticker} />
        <DetailRow label="Price" value={`$${fmt(info.price)}`} />
        <DetailRow label="Network" value="Base" />
        <DetailRow label="Transaction" value={shortHash(info.tx_hash)} mono copyValue={info.tx_hash} />
        <DetailRow label="Signal score" value={`${info.signal_score}%`} />
      </div>
      <ViewTxButton hash={info.tx_hash} />
    </>
  );
}

function SellModal({ info }: { info: SellInfo }) {
  const stock = STOCKS.find((s) => s.tokenTicker === info.ticker);
  return (
    <>
      <div className="flex flex-col items-center py-7 gap-1.5">
        <p className="text-4xl font-bold text-emerald-400">+${fmt(info.amount_usdc)}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {stock && <img src={stock.logo} alt={info.ticker} width={16} height={16} className="rounded-full bg-white p-px" />}
          <p className="text-white/40 text-sm">{info.shares.toFixed(6)} {info.ticker}</p>
        </div>
      </div>
      <div className="px-5 pb-2">
        <DetailRow label="Token" value={info.ticker} />
        <DetailRow label="Price" value={`$${fmt(info.price)}`} />
        <DetailRow label="Network" value="Base" />
        <DetailRow label="Transaction" value={shortHash(info.tx_hash)} mono copyValue={info.tx_hash} />
        <DetailRow label="Signal score" value={`${info.signal_score}%`} />
      </div>
      <ViewTxButton hash={info.tx_hash} />
    </>
  );
}

function GiftModal({ info }: { info: GiftInfo }) {
  const stock = STOCKS.find((s) => s.tokenTicker === info.ticker);
  return (
    <>
      <div className="flex flex-col items-center py-7 gap-1.5">
        <p className="text-4xl font-bold text-purple-400">{info.shares.toFixed(6)}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {stock && <img src={stock.logo} alt={info.ticker} width={16} height={16} className="rounded-full bg-white p-px" />}
          <p className="text-white/40 text-sm">{info.ticker} gifted</p>
        </div>
      </div>
      <div className="px-5 pb-2">
        <DetailRow label="Token" value={info.ticker} />
        <DetailRow label="To" value={shortAddr(info.to_address)} mono copyValue={info.to_address} />
        <DetailRow label="Network" value="Base" />
        <DetailRow label="Transaction" value={shortHash(info.tx_hash)} mono copyValue={info.tx_hash} />
      </div>
      <ViewTxButton hash={info.tx_hash} />
    </>
  );
}

function ErrorModal({ info }: { info: ErrorInfo }) {
  return (
    <div className="px-5 py-7 flex flex-col items-center gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center">
        <AlertCircle size={26} className="text-red-400" />
      </div>
      <p className="text-white font-semibold">Something went wrong</p>
      <p className="text-white/40 text-sm leading-relaxed">{info.reason}</p>
      {info.ticker && <p className="text-white/25 text-xs">While processing {info.ticker}</p>}
    </div>
  );
}

function InfoModal({ info }: { info: InfoInfo }) {
  return (
    <div className="px-5 py-7 flex flex-col items-center gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
        <Info size={26} className="text-white/40" />
      </div>
      <p className="text-white/50 text-sm leading-relaxed">{info.body}</p>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function ActionBadge({ type }: { type: ActivityType }) {
  if (type === "buy") return (
    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-[#1a1a1a]">
      <ArrowDownLeft size={10} className="text-black" strokeWidth={3} />
    </div>
  );
  if (type === "sell") return (
    <div className="w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center border-2 border-[#1a1a1a]">
      <ArrowUpRight size={10} className="text-black" strokeWidth={3} />
    </div>
  );
  if (type === "gift") return (
    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center border-2 border-[#1a1a1a]">
      <Gift size={9} className="text-white" strokeWidth={2.5} />
    </div>
  );
  if (type === "error") return (
    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center border-2 border-[#1a1a1a]">
      <AlertCircle size={10} className="text-white" strokeWidth={3} />
    </div>
  );
  return (
    <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center border-2 border-[#1a1a1a]">
      <Info size={9} className="text-white/60" strokeWidth={2.5} />
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

export function ActivityRow({ entry }: { entry: Activity }) {
  const { date, time, full } = formatDate(entry.created_at);

  const ticker = entry.info && "ticker" in entry.info ? (entry.info as { ticker: string }).ticker : undefined;
  const stock  = ticker ? STOCKS.find((s) => s.tokenTicker === ticker) : undefined;

  // Row amount + shares per type
  let rowAmount: string | null = null;
  let rowAmountColor = "text-white/25";
  let rowSub: string | null = null;

  if (entry.type === "buy") {
    rowAmount = `-$${fmt(entry.info.amount_usdc)}`;
    rowAmountColor = "text-white/70";
    rowSub = `${entry.info.shares.toFixed(6)} ${entry.info.ticker}`;
  } else if (entry.type === "sell") {
    rowAmount = `+$${fmt(entry.info.amount_usdc)}`;
    rowAmountColor = "text-emerald-400";
    rowSub = `${entry.info.shares.toFixed(6)} ${entry.info.ticker}`;
  } else if (entry.type === "gift") {
    rowAmount = `${entry.info.shares.toFixed(4)} ${entry.info.ticker}`;
    rowAmountColor = "text-purple-400";
    rowSub = `To ${shortAddr(entry.info.to_address)}`;
  }

  const isClickable = entry.type !== "info";

  const logoEl = stock ? (
    <img src={stock.logo} alt={stock.name} width={40} height={40} className="rounded-full bg-white p-0.5" />
  ) : (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
      entry.type === "error" ? "bg-red-500/15" :
      entry.type === "gift"  ? "bg-purple-500/15" :
      entry.type === "info"  ? "bg-white/5" : "bg-white/5"
    }`}>
      {entry.type === "error" ? <AlertCircle size={18} className="text-red-400" /> :
       entry.type === "gift"  ? <Gift size={18} className="text-purple-400" /> :
                                <Info size={18} className="text-white/20" />}
    </div>
  );

  const rowInner = (
    <div className={`grid grid-cols-[1fr_auto_auto] items-center px-5 py-4 gap-6 transition-colors ${isClickable ? "hover:bg-white/[0.02] cursor-pointer" : ""}`}>
      {/* Action */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          {logoEl}
          <div className="absolute -bottom-0.5 -right-0.5">
            <ActionBadge type={entry.type} />
          </div>
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate ${entry.type === "error" || entry.type === "info" ? "text-white/35" : "text-white"}`}>
            {entry.title}
          </p>
          <p className="text-xs text-white/30 mt-0.5 truncate">{entry.description}</p>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right">
        {rowAmount ? (
          <>
            <p className={`text-sm font-semibold ${rowAmountColor}`}>{rowAmount}</p>
            {rowSub && <p className="text-xs text-white/30 mt-0.5">{rowSub}</p>}
          </>
        ) : (
          <p className="text-xs text-white/20">—</p>
        )}
      </div>

      {/* Date */}
      <div className="text-right w-28">
        <p className="text-sm text-white/60">{date}</p>
        <p className="text-xs text-white/30 mt-0.5">{time}</p>
      </div>
    </div>
  );

  if (!isClickable) return <div>{rowInner}</div>;

  const modalContent = () => {
    if (entry.type === "buy")   return <BuyModal  info={entry.info} />;
    if (entry.type === "sell")  return <SellModal info={entry.info} />;
    if (entry.type === "gift")  return <GiftModal info={entry.info} />;
    if (entry.type === "error") return <ErrorModal info={entry.info} />;
  };

  return (
    <Dialog>
      <DialogTrigger className="w-full text-left">{rowInner}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0 w-8 h-8">
              {stock
                ? <img src={stock.logo} alt={stock.name} width={32} height={32} className="rounded-full bg-white p-0.5" />
                : <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    {entry.type === "error" ? <AlertCircle size={15} className="text-red-400" /> : <Gift size={15} className="text-purple-400" />}
                  </div>
              }
              <div className="absolute -bottom-0.5 -right-0.5"><ActionBadge type={entry.type} /></div>
            </div>
            <DialogTitle>{entry.title}</DialogTitle>
          </div>
          <DialogClose />
        </DialogHeader>
        {modalContent()}
      </DialogContent>
    </Dialog>
  );
}

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_ACTIVITY: Activity[] = [
  {
    id: "m0",
    type: "gift",
    title: "Gift sent",
    description: "AAPLc sent to a friend",
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    info: { ticker: "AAPLc", shares: 0.001254, to_address: "0x276d3f8b4e1a9c2b5d7e0f1234567890abcdb6A9", tx_hash: "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1" },
  },
  {
    id: "m1",
    type: "buy",
    title: "NVDAc",
    description: "Bought by agent",
    created_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    info: { ticker: "NVDAc", shares: 0.002341, amount_usdc: 5.00, price: 2136.22, tx_hash: "0xdef456abc123def456abc123def456abc123def456abc123def456abc123def4", signal_score: 74 },
  },
  {
    id: "m2",
    type: "info",
    title: "No trade",
    description: "No strong signals this run",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4.5).toISOString(),
    info: { body: "No strong signals this run" },
  },
  {
    id: "m3",
    type: "buy",
    title: "AAPLc",
    description: "Bought by agent",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    info: { ticker: "AAPLc", shares: 0.001254, amount_usdc: 3.20, price: 2552.10, tx_hash: "0x111222333444555666777888999aaabbbccc111222333444555666777888999a", signal_score: 68 },
  },
  {
    id: "m4",
    type: "sell",
    title: "Sold METAc",
    description: "Sold by agent",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    info: { ticker: "METAc", shares: 0.000983, amount_usdc: 4.10, price: 4170.80, tx_hash: "0x999888777666555444333222111aaabbbccc999888777666555444333222111b", signal_score: 31 },
  },
  {
    id: "m5",
    type: "error",
    title: "Trade failed",
    description: "Could not execute trade",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    info: { reason: "Pool liquidity too low to execute trade safely", ticker: "AAPLc" },
  },
];
