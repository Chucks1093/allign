import type { SignalScores, TradeSignal, StockSignal } from "./types";
import type { Stock } from "@/lib/stocks/tokens";

const WEIGHTS = {
  momentum: 0.35,
  sentiment: 0.30,
  poolHealth: 0.20,
  polymarket: 0.10,
  relativeStrength: 0.05,
} as const;

const BUY_THRESHOLD = 0.62;
const SELL_THRESHOLD = 0.35;
const MAX_KELLY_FRACTION = 0.10;

// Minimum absolute price move to qualify as real momentum — not just "least bad on a slow day"
const MIN_MOMENTUM_CHANGE = 0.5; // must be up at least +0.5% in absolute terms

function clamp(x: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, x));
}

function kellyFraction(composite: number): number {
  const edge = composite - 0.5;
  if (edge <= 0) return 0;
  const kellyFull = edge / (1 - edge);
  return clamp(kellyFull * 0.5, 0, MAX_KELLY_FRACTION);
}

export function computeSignal(
  stock: Stock,
  scores: SignalScores,
  price: number,
  change24h: number
): StockSignal {
  const composite = clamp(
    WEIGHTS.momentum * scores.momentum +
    WEIGHTS.sentiment * scores.sentiment +
    WEIGHTS.poolHealth * scores.poolHealth +
    WEIGHTS.polymarket * scores.polymarket +
    WEIGHTS.relativeStrength * scores.relativeStrength
  );

  let signal: TradeSignal = "hold";

  const hasRealMomentum = change24h >= MIN_MOMENTUM_CHANGE;
  const hasGoodSentiment = scores.sentiment >= 0.55;
  const isTradable = scores.poolHealth > 0;

  // Buy only when: composite high enough AND stock is actually moving up AND tradable
  if (composite >= BUY_THRESHOLD && isTradable && hasRealMomentum) {
    signal = "buy";
  } else if (composite <= SELL_THRESHOLD) {
    signal = "sell";
  }

  if (stock.tradable === false && signal === "buy") signal = "hold";

  const kelly = signal === "buy" ? kellyFraction(composite) : 0;

  const reasons: string[] = [];
  if (signal === "buy") {
    reasons.push(`+${change24h.toFixed(2)}% momentum`);
    if (hasGoodSentiment) reasons.push(`positive sentiment (${(scores.sentiment * 100).toFixed(0)})`);
    if (scores.polymarket > 0.55) reasons.push(`Polymarket bullish`);
  } else if (signal === "sell") {
    if (change24h < 0) reasons.push(`${change24h.toFixed(2)}% momentum`);
    if (scores.sentiment < 0.4) reasons.push(`negative sentiment`);
  } else {
    if (!isTradable) reasons.push("pool not tradable");
    else if (!hasRealMomentum) reasons.push(`only +${change24h.toFixed(2)}% (need +${MIN_MOMENTUM_CHANGE}%)`);
    else reasons.push(`composite ${(composite * 100).toFixed(0)} below threshold`);
  }

  const reasoning = `${signal.toUpperCase()} (composite ${(composite * 100).toFixed(0)}%): ${reasons.join(", ")}.`;

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
