import type { SignalScores, TradeSignal, StockSignal } from "./types";
import type { Stock } from "@/lib/stocks/tokens";

// Signal weights — must sum to 1.0
const WEIGHTS = {
  momentum: 0.30,
  polymarket: 0.25,
  sentiment: 0.20,
  poolHealth: 0.15,
  relativeStrength: 0.10,
} as const;

const BUY_THRESHOLD = 0.65;
const SELL_THRESHOLD = 0.35;
const MAX_KELLY_FRACTION = 0.10; // Never more than 10% of budget per trade

function clamp(x: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, x));
}

function kellyFraction(composite: number): number {
  const edge = composite - 0.5;
  if (edge <= 0) return 0;
  const kellyFull = edge / (1 - edge);
  const kellyHalf = kellyFull * 0.5; // Half-Kelly: more conservative
  return clamp(kellyHalf, 0, MAX_KELLY_FRACTION);
}

function buildReasoning(
  stock: Stock,
  scores: SignalScores,
  composite: number,
  signal: TradeSignal,
  change24h: number
): string {
  const parts: string[] = [];

  if (signal === "buy") {
    if (scores.momentum > 0.6) parts.push(`price +${change24h.toFixed(2)}% (strong momentum)`);
    if (scores.polymarket > 0.6) parts.push(`Polymarket consensus bullish`);
    if (scores.sentiment > 0.65) parts.push(`positive news sentiment`);
    if (scores.relativeStrength > 0.7) parts.push(`outperforming B20 peers`);
    return `Buy signal (${(composite * 100).toFixed(0)}% confidence): ${parts.join(", ") || "composite signals favorable"}.`;
  }

  if (signal === "sell") {
    if (scores.momentum < 0.4) parts.push(`price ${change24h.toFixed(2)}% (weakening)`);
    if (scores.sentiment < 0.35) parts.push(`negative news sentiment`);
    if (scores.relativeStrength < 0.3) parts.push(`underperforming peers`);
    return `Sell signal (${(composite * 100).toFixed(0)}% confidence): ${parts.join(", ") || "composite signals unfavorable"}.`;
  }

  return `Hold — composite score ${(composite * 100).toFixed(0)}%, insufficient signal strength.`;
}

export function computeSignal(
  stock: Stock,
  scores: SignalScores,
  price: number,
  change24h: number
): StockSignal {
  const composite = clamp(
    WEIGHTS.momentum * scores.momentum +
    WEIGHTS.polymarket * scores.polymarket +
    WEIGHTS.sentiment * scores.sentiment +
    WEIGHTS.poolHealth * scores.poolHealth +
    WEIGHTS.relativeStrength * scores.relativeStrength
  );

  let signal: TradeSignal = "hold";
  if (composite >= BUY_THRESHOLD && scores.poolHealth > 0) signal = "buy";
  else if (composite <= SELL_THRESHOLD) signal = "sell";

  // Non-tradable stocks can never be bought
  if (stock.tradable === false && signal === "buy") signal = "hold";

  const kelly = signal === "buy" ? kellyFraction(composite) : 0;
  const reasoning = buildReasoning(stock, scores, composite, signal, change24h);

  return {
    stock,
    price,
    change24h,
    scores,
    composite,
    signal,
    kelly,
    reasoning,
    scoredAt: Math.floor(Date.now() / 1000),
  };
}
