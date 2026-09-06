import type { Stock } from "@/lib/stocks/tokens";

export interface SignalScores {
  momentum: number;        // 0-1: price trend strength + direction
  polymarket: number;      // 0-1: prediction market consensus
  sentiment: number;       // 0-1: news sentiment score
  poolHealth: number;      // 0-1: liquidity + feed alignment
  relativeStrength: number; // 0-1: rank vs other B20 tokens
}

export type TradeSignal = "buy" | "sell" | "hold";

export interface StockSignal {
  stock: Stock;
  price: number;
  change24h: number;       // percentage e.g. 2.3 = +2.3%
  scores: SignalScores;
  composite: number;       // 0-1 weighted composite
  signal: TradeSignal;
  kelly: number;           // position fraction of daily budget
  reasoning: string;       // human-readable explanation
  scoredAt: number;        // unix timestamp
}

export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  liquidity: number;
  volume24h: number;
  bestBid?: number;
  bestAsk?: number;
  lastPrice?: number;
  endsAt?: string;
}

export interface AgentConfig {
  walletAddress: string;
  dailyBudgetUsdc: number;
  spendPermission?: unknown;
  permissionExpiresAt?: number;
}

export interface TradeDecision {
  stock: Stock;
  side: "buy" | "sell";
  amountUsdc: number;      // for buy
  amountShares?: number;   // for sell
  signal: StockSignal;
}
