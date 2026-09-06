import { STOCKS } from "@/lib/stocks/tokens";
import { scoreMomentum } from "./momentum";
import { scorePolymarket } from "./polymarket";
import { scoreSentiment } from "./sentiment";
import { scorePoolHealth } from "./pool";
import { computeSignal } from "./scorer";
import type { StockSignal, SignalScores } from "./types";

function relativeStrengthScores(momentumScores: { ticker: string; score: number }[]): Map<string, number> {
  const sorted = [...momentumScores].sort((a, b) => a.score - b.score);
  const map = new Map<string, number>();
  sorted.forEach((item, idx) => {
    // Rank from 0 to 1: worst = 0, best = 1
    map.set(item.ticker, sorted.length > 1 ? idx / (sorted.length - 1) : 0.5);
  });
  return map;
}

export async function scoreAllStocks(): Promise<StockSignal[]> {
  // Fetch all signal sources in parallel
  const [momentumResults, polymarketResults, sentimentResults, poolResults] = await Promise.all([
    scoreMomentum(),
    scorePolymarket(),
    scoreSentiment(),
    scorePoolHealth(),
  ]);

  // Build lookup maps
  const momentumMap = new Map(momentumResults.map((r) => [r.ticker, r]));
  const polymarketMap = new Map(polymarketResults.map((r) => [r.ticker, r]));
  const sentimentMap = new Map(sentimentResults.map((r) => [r.ticker, r]));
  const poolMap = new Map(poolResults.map((r) => [r.ticker, r]));
  const relStrengthMap = relativeStrengthScores(momentumResults);

  const signals: StockSignal[] = [];

  for (const stock of STOCKS) {
    const momentum = momentumMap.get(stock.ticker);
    const polymarket = polymarketMap.get(stock.ticker);
    const sentiment = sentimentMap.get(stock.ticker);
    const pool = poolMap.get(stock.ticker);
    const relStrength = relStrengthMap.get(stock.ticker) ?? 0.5;

    const scores: SignalScores = {
      momentum: momentum?.score ?? 0.5,
      polymarket: polymarket?.score ?? 0.5,
      sentiment: sentiment?.score ?? 0.5,
      poolHealth: pool?.score ?? 0,
      relativeStrength: relStrength,
    };

    const signal = computeSignal(
      stock,
      scores,
      momentum?.price ?? 0,
      momentum?.change24h ?? 0
    );

    signals.push(signal);
  }

  // Sort by composite score descending
  return signals.sort((a, b) => b.composite - a.composite);
}

export function getTradeDecisions(
  signals: StockSignal[],
  dailyBudgetUsdc: number,
  remainingBudgetUsdc: number
): { buys: StockSignal[]; sells: StockSignal[] } {
  const buys = signals
    .filter((s) => s.signal === "buy" && s.kelly > 0)
    .map((s) => ({
      ...s,
      // Calculate actual dollar amount: kelly fraction of budget, min $0.30
      tradeAmount: Math.max(s.kelly * dailyBudgetUsdc, 0.30),
    }))
    .filter((s) => s.tradeAmount <= remainingBudgetUsdc);

  const sells = signals.filter((s) => s.signal === "sell");

  return { buys: buys.map(({ tradeAmount: _, ...s }) => s), sells };
}
